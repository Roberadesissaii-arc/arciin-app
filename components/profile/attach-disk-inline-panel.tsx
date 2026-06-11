"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  HardDrive,
  Loader2,
  Lock,
  RefreshCw,
  Usb,
} from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { isInstanceOwner } from "@/lib/auth/instance-admin"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { useConnection } from "@/components/providers/connection-provider"
import { ApiError, formatApiError } from "@/lib/api/errors"
import {
  getStorageMigrateStatus,
  getStorageSettings,
  getStorageVolumes,
  mountStorageDevice,
  startStorageMigration,
} from "@/lib/api/settings"
import { MobileMountDiskSheet } from "@/components/profile/mobile-mount-disk-sheet"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import { formatBytes } from "@/lib/utils/format-bytes"
import type {
  StorageMigrateStatus,
  StorageVolumeOption,
  UnmountedBlockDevice,
} from "@/lib/types/models"

function formatVolumeFree(option: StorageVolumeOption) {
  if (option.availableBytes == null) return "Space unknown"
  const total = option.totalBytes != null ? formatBytes(option.totalBytes) : "?"
  return `${formatBytes(option.availableBytes)} free of ${total}`
}

function DrivesSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <div className="h-14 animate-pulse rounded-lg bg-[#ececec]" />
      <div className="h-14 animate-pulse rounded-lg bg-[#ececec]" />
    </div>
  )
}

function UnmountedDrivesBlock({
  devices,
  disabled,
  mountingId,
  onMount,
}: {
  devices: UnmountedBlockDevice[]
  disabled?: boolean
  mountingId: string | null
  onMount: (device: UnmountedBlockDevice) => void
}) {
  if (!devices.length) return null

  return (
    <div
      className="rounded-xl bg-[#f7f7f7] p-3"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <p className="mb-2 text-[12px] font-semibold text-[#222222]">
        Unmounted drives ({devices.length})
      </p>
      <ul className="flex flex-col gap-2">
        {devices.map((device) => {
          const mounting = mountingId === device.id
          return (
            <li
              key={device.id}
              className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <HardDrive className="size-4 shrink-0 text-[#a0a0a0]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[#222222]">
                  {device.device}
                </p>
                <p className="text-[10px] text-[#a0a0a0]">
                  {device.sizeLabel}
                  {(device.isLuks ||
                    (device.filesystem && /^crypto_LUKS/i.test(device.filesystem))) ? (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#717171]">
                      <Lock className="size-2.5" />
                      Encrypted
                    </span>
                  ) : device.needsFormat ? (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#b45309]">
                      <AlertTriangle className="size-2.5" />
                      Needs format
                    </span>
                  ) : device.filesystem ? (
                    ` · ${device.filesystem}`
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled || mounting}
                onClick={() => onMount(device)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50 u-accent-bg"
              >
                {mounting ? <Loader2 className="size-3.5 animate-spin" /> : "Mount"}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AttachDiskInlinePanel({ enabled }: { enabled: boolean }) {
  const { connection: authConnection, serverReachable } = useConnection()
  const canTransfer = isInstanceOwner(authConnection?.user?.role)
  const [selected, setSelected] = useState<StorageVolumeOption | null>(null)
  const [migrateStatus, setMigrateStatus] = useState<StorageMigrateStatus | null>(null)
  const [migrateError, setMigrateError] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)
  const [mountingId, setMountingId] = useState<string | null>(null)
  const [mountError, setMountError] = useState<string | null>(null)
  const [mountSheet, setMountSheet] = useState<{
    device: UnmountedBlockDevice
    needsSudo: boolean
    offerFormat?: boolean
  } | null>(null)

  const volumesLoader = useCallback(
    (conn: Parameters<typeof getStorageVolumes>[0], signal: AbortSignal) =>
      getStorageVolumes(conn, signal),
    [],
  )

  const usageLoader = useCallback(
    (conn: Parameters<typeof getStorageSettings>[0], signal: AbortSignal) =>
      getStorageSettings(conn, signal),
    [],
  )

  const {
    data: volumesData,
    loading: volumesWaiting,
    isRevalidating: volumesRefreshing,
    error: volumesError,
    showingCachedOffline: volumesOffline,
    connection,
    reload: reloadVolumes,
  } = useStablePanelLoad(enabled, volumesLoader, {
    cacheKey: "attach-disk-volumes",
    staleTimeMs: 120_000,
  })

  const { data: usage } = useStablePanelLoad(enabled, usageLoader, {
    cacheKey: "attach-disk-usage",
    staleTimeMs: 120_000,
  })

  const loadMigrateStatus = useCallback(async () => {
    if (!connection) return
    try {
      const status = await getStorageMigrateStatus(connection)
      setMigrateStatus(status)
      return status
    } catch {
      return null
    }
  }, [connection])

  useEffect(() => {
    if (!enabled || !connection) return
    void loadMigrateStatus()
  }, [enabled, connection, loadMigrateStatus])

  useEffect(() => {
    if (!enabled || !connection || !migrateStatus?.active) return
    const id = window.setInterval(() => {
      void loadMigrateStatus().then((status) => {
        if (status?.job?.status === "COMPLETED") {
          showStatus("Transfer finished. Storage is now on the new disk.")
          void reloadVolumes()
        }
      })
    }, 2000)
    return () => window.clearInterval(id)
  }, [enabled, connection, migrateStatus?.active, loadMigrateStatus, reloadVolumes])

  async function mountDevice(
    device: UnmountedBlockDevice,
    passwords?: {
      luksPassphrase?: string
      sudoPassword?: string
      formatAsExt4?: boolean
      confirmErase?: boolean
    },
  ) {
    if (!connection) return
    setMountingId(device.id)
    setMountError(null)
    try {
      const result = await mountStorageDevice(connection, {
        deviceId: device.id,
        luksPassphrase: passwords?.luksPassphrase,
        sudoPassword: passwords?.sudoPassword,
        formatAsExt4: passwords?.formatAsExt4,
        confirmErase: passwords?.confirmErase,
      })
      showStatus(`Mounted at ${result.mountPoint}`)
      setMountSheet(null)
      void reloadVolumes()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "SUDO_PASSWORD_REQUIRED" || err.code === "LUKS_PASSPHRASE_REQUIRED") {
          setMountSheet({
            device,
            needsSudo: true,
            offerFormat: Boolean(device.needsFormat),
          })
          throw err
        }
        if (err.code === "NO_FILESYSTEM" || err.code === "ERASE_NOT_CONFIRMED") {
          setMountSheet({
            device,
            needsSudo: true,
            offerFormat: true,
          })
          throw err
        }
      }
      setMountError(formatApiError(err))
      throw err
    } finally {
      setMountingId(null)
    }
  }

  function isDeviceLuks(device: UnmountedBlockDevice) {
    return Boolean(
      device.isLuks || (device.filesystem && /^crypto_LUKS/i.test(device.filesystem)),
    )
  }

  function handleMountClick(device: UnmountedBlockDevice) {
    setMountError(null)
    setMountSheet({
      device,
      needsSudo: true,
      offerFormat: Boolean(device.needsFormat),
    })
  }

  async function handleTransfer() {
    if (!connection || !selected || selected.isCurrent) return
    setTransferring(true)
    setMigrateError(null)
    clearStatus()
    try {
      await startStorageMigration(connection, selected.arciinPath)
      showStatus("Transfer started. Keep Arciin running until it finishes.")
      await loadMigrateStatus()
    } catch (err) {
      setMigrateError(formatApiError(err))
    } finally {
      setTransferring(false)
    }
  }

  if (!enabled) return null

  const volumes = volumesData?.volumes ?? []
  const unmountedDevices = volumesData?.unmountedDevices ?? []
  const isDocker = volumesData?.isDockerRuntime ?? false
  const showVolumesSkeleton = volumesWaiting && volumes.length === 0
  const volumesErrorText = suppressFetchErrorWhenOffline(serverReachable, volumesError)
  const active = migrateStatus?.active ?? false
  const job = migrateStatus?.job
  const transferTarget = selected && !selected.isCurrent ? selected : null
  const currentVolume = volumes.find((v) => v.isCurrent)

  return (
    <AdminSettingsGate feature="Attach disk">
      <div className="flex flex-col gap-4">
        <SettingsIntroCard
          icon={Usb}
          title="Attach disk"
          description={
            isDocker
              ? "Mount a larger SSD or USB drive on your server, then move all library files to it."
              : "Detect external SSDs and USB drives, mount them here, then transfer your library files."
          }
        />

        {volumesOffline ? (
          <OfflineCachedNotice revalidating={volumesRefreshing} />
        ) : null}

        {currentVolume ? (
          <p className="text-[11px] leading-relaxed text-[#717171]">
            <span className="font-medium text-[#222222]">In use:</span>{" "}
            <span className="font-mono">{currentVolume.arciinPath}</span>
            {usage ? (
              <span> · about {formatBytes(usage.usageBytes)} in libraries</span>
            ) : null}
          </p>
        ) : null}

        {active && job ? (
          <div
            className="rounded-xl px-3 py-3"
            style={{ border: "1px solid #e5e5e5", backgroundColor: "#f7f7f7" }}
          >
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-[#222222]">Transfer in progress</span>
              <span className="text-accent tabular-nums">{job.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#ececec]">
              <div
                className="accent-progress-fill h-full rounded-full transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[#a0a0a0]">
              Do not stop the API or worker until this completes.
            </p>
          </div>
        ) : null}

        {job?.status === "FAILED" && job.error ? (
          <MutedPanelError error={job.error} />
        ) : null}

        {unmountedDevices.length > 0 ? (
          <UnmountedDrivesBlock
            devices={unmountedDevices}
            disabled={active || transferring || volumesRefreshing}
            mountingId={mountingId}
            onMount={handleMountClick}
          />
        ) : null}

        {mountError ? <MutedPanelError error={mountError} /> : null}

        {mountSheet ? (
          <MobileMountDiskSheet
            key={mountSheet.device.id}
            device={mountSheet.device}
            needsSudoPassword={mountSheet.needsSudo}
            offerFormat={mountSheet.offerFormat}
            mounting={mountingId === mountSheet.device.id}
            onClose={() => {
              if (mountingId) return
              setMountSheet(null)
            }}
            onMount={(passwords) => mountDevice(mountSheet.device, passwords)}
          />
        ) : null}

        <div
          className="rounded-xl bg-[#f7f7f7] p-3"
          style={{ border: "1px solid #e5e5e5", minHeight: showVolumesSkeleton ? 140 : undefined }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-[#222222]">Mounted drives</p>
            <button
              type="button"
              disabled={volumesRefreshing || active}
              onClick={() => reloadVolumes()}
              className="flex items-center gap-1 text-[11px] font-medium text-[#717171] disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${volumesRefreshing ? "animate-spin" : ""}`}
              />
              {volumesRefreshing ? "Updating…" : "Rescan"}
            </button>
          </div>

          {showVolumesSkeleton ? (
            <DrivesSkeleton />
          ) : volumesErrorText && volumes.length === 0 ? (
            <MutedPanelError error={volumesErrorText} onRetry={() => void reloadVolumes()} />
          ) : volumes.length === 0 ? (
            <p className="py-2 text-[12px] text-[#a0a0a0]">
              No volumes reported. Mount a drive on the server, then rescan.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {volumes.map((vol) => {
                const isCurrent = Boolean(vol.isCurrent)
                const isSelected = !isCurrent && transferTarget?.id === vol.id
                return (
                  <li key={vol.id}>
                    <button
                      type="button"
                      disabled={active || transferring || isCurrent}
                      onClick={() => !isCurrent && setSelected(vol)}
                      className={`w-full rounded-lg px-2.5 py-2 text-left disabled:opacity-60 ${
                        isCurrent || isSelected ? "accent-selected-card" : "border border-[#e5e5e5] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCurrent ? (
                          <BadgeCheck className="text-accent mt-0.5 size-4 shrink-0" />
                        ) : (
                          <HardDrive className="mt-0.5 size-4 shrink-0 text-[#a0a0a0]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[12px] font-medium text-[#222222]">{vol.label}</p>
                            {isCurrent ? (
                              <span className="accent-chip rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                                In use
                              </span>
                            ) : vol.largeExternal ? (
                              <span className="rounded-md bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-medium text-[#717171]">
                                External
                              </span>
                            ) : vol.sameDiskAsCurrent ? (
                              <span className="rounded-md bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-medium text-[#717171]">
                                Same disk
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate font-mono text-[10px] text-[#a0a0a0]">
                            {vol.arciinPath}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#a0a0a0]">
                            {formatVolumeFree(vol)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          disabled={
            !canTransfer ||
            !transferTarget ||
            active ||
            transferring ||
            !transferTarget.writable
          }
          onClick={() => void handleTransfer()}
          className="btn-accent-solid flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
        >
          {transferring || active ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="size-4" />
          )}
          Transfer all files here
        </button>

        {!canTransfer ? (
          <p className="text-[11px] leading-relaxed text-[#92400e]">
            Only the instance owner can start a full library transfer. Admins can mount drives and
            rescan volumes.
          </p>
        ) : (
          <p className="text-[10px] leading-relaxed text-[#a0a0a0]">
            Copies objects, libraries, thumbnails, and logs to the selected drive. Updates paths
            automatically. Original data is never deleted.
          </p>
        )}

        {migrateError ? <MutedPanelError error={migrateError} /> : null}

        <PanelStatusBanner message={message} />
      </div>
    </AdminSettingsGate>
  )
}
