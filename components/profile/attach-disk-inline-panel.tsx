"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRightLeft,
  Check,
  Circle,
  HardDrive,
  Loader2,
  RefreshCw,
} from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { isInstanceOwner } from "@/lib/auth/instance-admin"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
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
import { cn } from "@/lib/utils"
import type {
  StorageBlockDisk,
  StorageMigrateStatus,
  StorageVolumeOption,
  UnmountedBlockDevice,
} from "@/lib/types/models"

function diskRoleLabel(role: StorageBlockDisk["role"]) {
  if (role === "system") return "System"
  if (role === "attached") return "Attached"
  return "Internal"
}

function formatVolumeFree(option: StorageVolumeOption) {
  if (option.availableBytes == null) return "Space unknown"
  const total = option.totalBytes != null ? formatBytes(option.totalBytes) : "?"
  return `${formatBytes(option.availableBytes)} free of ${total}`
}

function volumeOnDisk(disk: StorageBlockDisk, volumes: StorageVolumeOption[]) {
  return volumes.find((v) => v.device?.includes(disk.name))
}

const driveCardBase =
  "flex w-full items-start gap-3 rounded-xl border border-[#e5e5e5] bg-white px-3 py-3 text-left transition-colors active:opacity-95"

function DriveIconBadge({ selected, muted }: { selected?: boolean; muted?: boolean }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        selected ? "accent-highlight-box" : "border border-[#e5e5e5] bg-[#f7f7f7]",
        muted && !selected && "opacity-70",
      )}
    >
      <HardDrive
        className={cn("size-4", selected ? "text-accent" : muted ? "text-[#c0c0c0]" : "text-[#717171]")}
      />
    </div>
  )
}

function RescanButton({
  loading,
  disabled,
  onClick,
  label = "Rescan",
}: {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#f7f7f7] px-2.5 text-[11px] font-semibold text-[#717171] active:bg-[#ececec] disabled:opacity-50"
    >
      <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      {loading ? "Scanning…" : label}
    </button>
  )
}

function AttachSection({
  step,
  title,
  hint,
  action,
  children,
}: {
  step?: string
  title: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {step ? (
              <span className="accent-chip flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold">
                {step}
              </span>
            ) : null}
            <p className="text-[13px] font-semibold text-[#222222]">{title}</p>
          </div>
          {hint ? <p className="mt-1 text-[11px] leading-relaxed text-[#717171]">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function MetaLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] text-[#a0a0a0]">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-[11px] text-[#222222]",
          mono && "truncate font-mono text-[10px] text-[#717171]",
        )}
      >
        {value}
      </span>
    </div>
  )
}

function DrivesSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <div className="h-[72px] animate-pulse rounded-xl bg-[#ececec]" />
      <div className="h-[72px] animate-pulse rounded-xl bg-[#ececec]" />
    </div>
  )
}

function CurrentStorageCard({
  volume,
  usageBytes,
  deviceContext,
}: {
  volume: StorageVolumeOption
  usageBytes?: number
  deviceContext: {
    blockDevice?: string | null
    blockDeviceModel?: string | null
    blockDeviceSizeBytes?: number | null
    filesystemTotalBytes?: number | null
  } | null
}) {
  const partitionNote =
    deviceContext?.blockDevice &&
    deviceContext.blockDeviceSizeBytes &&
    deviceContext.filesystemTotalBytes &&
    deviceContext.blockDeviceSizeBytes > deviceContext.filesystemTotalBytes * 1.05

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#fafafa]">
      <div className="flex items-start gap-3 px-3.5 py-3.5">
        <DriveIconBadge selected />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-[#222222]">Current storage</p>
            <span className="accent-chip rounded-md px-2 py-0.5 text-[10px] font-semibold">In use</span>
          </div>
          <p className="mt-1 break-all font-mono text-[11px] leading-snug text-[#717171]">
            {volume.arciinPath}
          </p>
        </div>
      </div>

      <div className="border-t border-[#f0f0f0] px-3.5 py-1">
        {usageBytes != null ? (
          <MetaLine label="Libraries" value={`About ${formatBytes(usageBytes)}`} />
        ) : null}
        <MetaLine label="Free on volume" value={formatVolumeFree(volume)} />
        {volume.device ? (
          <MetaLine
            label="Filesystem"
            value={`${volume.device}${volume.filesystem ? ` · ${volume.filesystem}` : ""}`}
            mono
          />
        ) : null}
        {deviceContext?.blockDevice ? (
          <MetaLine
            label="Physical disk"
            value={`${deviceContext.blockDevice}${
              deviceContext.blockDeviceModel ? ` · ${deviceContext.blockDeviceModel}` : ""
            } · ${formatBytes(deviceContext.blockDeviceSizeBytes ?? 0)}`}
            mono
          />
        ) : null}
      </div>

      {partitionNote ? (
        <div className="border-t border-[#f0f0f0] px-3.5 py-2.5">
          <p className="text-[10px] leading-relaxed text-[#717171]">
            Arciin uses a{" "}
            <span className="font-medium text-[#222222]">
              {formatBytes(deviceContext!.filesystemTotalBytes!)}
            </span>{" "}
            partition on this disk, not the full{" "}
            <span className="font-medium text-[#222222]">
              {formatBytes(deviceContext!.blockDeviceSizeBytes!)}
            </span>
            .
          </p>
        </div>
      ) : null}
    </div>
  )
}

function UnmountedDrivesBlock({
  devices,
  disabled,
  selectedId,
  onSelect,
  isDocker,
}: {
  devices: UnmountedBlockDevice[]
  disabled?: boolean
  selectedId: string | null
  onSelect: (device: UnmountedBlockDevice | null) => void
  isDocker?: boolean
}) {
  if (devices.length === 0) return null

  return (
    <AttachSection
      step="1"
      title="Mount a new drive"
      hint={
        isDocker
          ? "Mount on the server host, then tap Rescan."
          : "Tap a drive below, then Mount. Continue to step 2 to move your libraries."
      }
    >
      <ul className="flex flex-col gap-2">
        {devices.map((device) => {
          const isSelected = selectedId === device.id
          return (
            <li key={device.id}>
              <button
                type="button"
                disabled={disabled || isDocker}
                onClick={() => onSelect(isSelected ? null : device)}
                className={cn(driveCardBase, isSelected && "accent-selected-card border-transparent")}
              >
                <DriveIconBadge selected={isSelected} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-mono text-[12px] font-semibold text-[#222222]">
                      {device.device}
                    </p>
                    {isSelected ? <Check className="text-accent size-4 shrink-0" /> : null}
                  </div>
                  <p className="mt-1 text-[11px] text-[#717171]">
                    {device.sizeLabel}
                    {device.model ? ` · ${device.model}` : ""}
                  </p>
                  <p className="mt-2 truncate font-mono text-[10px] text-[#a0a0a0]">
                    → {device.suggestedArciinPath}
                  </p>
                  {device.needsFormat ? (
                    <p className="text-accent mt-2 text-[10px] font-semibold">Needs format before use</p>
                  ) : (
                    <p className="mt-2 text-[10px] text-[#a0a0a0]">Ready to mount</p>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </AttachSection>
  )
}

function TransferTargetsBlock({
  options,
  selectedId,
  disabled,
  loading,
  errorText,
  hint,
  onSelect,
  onRescan,
  rescanning,
}: {
  options: StorageVolumeOption[]
  selectedId: string | null
  disabled?: boolean
  loading?: boolean
  errorText?: string | null
  hint: string
  onSelect: (vol: StorageVolumeOption) => void
  onRescan: () => void
  rescanning?: boolean
}) {
  return (
    <AttachSection
      step="2"
      title="Move files to"
      hint={hint}
      action={
        <RescanButton loading={rescanning} disabled={disabled} onClick={onRescan} />
      }
    >
      {loading ? (
        <DrivesSkeleton />
      ) : errorText && options.length === 0 ? (
        <MutedPanelError error={errorText} onRetry={onRescan} />
      ) : options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-[#fafafa] px-3.5 py-4 text-center">
          <p className="text-[12px] leading-relaxed text-[#717171]">
            No separate disk ready yet.
            <br />
            Complete step 1, then tap Rescan.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {options.map((vol) => {
            const isSelected = selectedId === vol.id
            return (
              <li key={vol.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(vol)}
                  className={cn(driveCardBase, isSelected && "accent-selected-card border-transparent")}
                >
                  <DriveIconBadge selected={isSelected} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-semibold text-[#222222]">{vol.label}</p>
                      {isSelected ? <Check className="text-accent size-4 shrink-0" /> : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-[#a0a0a0]">{vol.arciinPath}</p>
                    <p className="mt-2 text-[11px] font-medium text-[#717171]">{formatVolumeFree(vol)}</p>
                    {vol.device ? (
                      <p className="mt-1 truncate font-mono text-[10px] text-[#a0a0a0]">
                        {vol.device}
                        {vol.filesystem ? ` · ${vol.filesystem}` : ""}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </AttachSection>
  )
}

function PhysicalDisksInfo({
  disks,
  volumes,
  onRescan,
  rescanning,
  disabled,
}: {
  disks: StorageBlockDisk[]
  volumes: StorageVolumeOption[]
  onRescan: () => void
  rescanning?: boolean
  disabled?: boolean
}) {
  if (disks.length === 0) return null

  return (
    <AttachSection
      title="Physical disks"
      hint="Reference only — pick a drive in step 1 to mount, then step 2 to transfer."
      action={<RescanButton loading={rescanning} disabled={disabled} onClick={onRescan} />}
    >
      <ul className="flex flex-col gap-2">
        {disks.map((disk) => {
          const current = volumeOnDisk(disk, volumes)?.isCurrent
          return (
            <li key={disk.id}>
              <div className={cn(driveCardBase, "cursor-default active:opacity-100")}>
                <DriveIconBadge muted />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-mono text-[12px] font-semibold text-[#222222]">{disk.device}</p>
                    <span className="rounded-md border border-[#e5e5e5] bg-[#f7f7f7] px-1.5 py-0.5 text-[10px] font-medium text-[#717171]">
                      {disk.sizeLabel}
                    </span>
                    <span className="rounded-md border border-[#e5e5e5] bg-[#f7f7f7] px-1.5 py-0.5 text-[10px] font-medium text-[#717171]">
                      {diskRoleLabel(disk.role)}
                    </span>
                  </div>
                  {disk.model ? (
                    <p className="mt-1 text-[11px] text-[#717171]">{disk.model}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {current ? (
                      <span className="accent-chip inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold">
                        <Circle className="size-1.5 fill-current" />
                        Arciin here
                      </span>
                    ) : null}
                    {disk.unmountedPartitionCount > 0 ? (
                      <span className="text-accent text-[10px] font-medium">
                        {disk.unmountedPartitionCount} ready in step 1
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </AttachSection>
  )
}

export function AttachDiskInlinePanel({ enabled }: { enabled: boolean }) {
  const { connection: authConnection, serverReachable } = useConnection()
  const canTransfer = isInstanceOwner(authConnection?.user?.role)
  const [selected, setSelected] = useState<StorageVolumeOption | null>(null)
  const [selectedUnmounted, setSelectedUnmounted] = useState<UnmountedBlockDevice | null>(null)
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
    cacheKey: "attach-disk-volumes-v5",
    staleTimeMs: 30_000,
  })

  const { data: usage } = useStablePanelLoad(enabled, usageLoader, {
    cacheKey: "attach-disk-usage",
    staleTimeMs: 120_000,
  })

  const attachDiskWasOpenRef = useRef(false)

  useEffect(() => {
    if (!enabled || !connection) {
      attachDiskWasOpenRef.current = false
      return
    }
    if (!attachDiskWasOpenRef.current) {
      void reloadVolumes()
    }
    attachDiskWasOpenRef.current = true
  }, [enabled, connection?.sessionToken, reloadVolumes])

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
  }, [enabled, connection, migrateStatus?.active, loadMigrateStatus, reloadVolumes, showStatus])

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
      setSelectedUnmounted(null)
      if (connection) {
        const refreshed = await getStorageVolumes(connection)
        const next =
          refreshed.migrationTargets?.find((v) => v.arciinPath === result.arciinPath) ??
          refreshed.migrationTargets?.[0] ??
          refreshed.volumes.find((v) => v.arciinPath === result.arciinPath && !v.isCurrent)
        if (next) setSelected(next)
      }
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
        if (err.code === "FORMAT_FAILED") {
          setMountError(formatApiError(err))
          void reloadVolumes()
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

    if (volumesData?.isDockerRuntime) return

    const needsLuks = isDeviceLuks(device)
    const needsFormat = Boolean(device.needsFormat)
    const passwordless = volumesData?.mountPasswordlessSudo ?? false

    if (passwordless && !needsLuks && !needsFormat) {
      void mountDevice(device)
      return
    }

    setMountSheet({
      device,
      needsSudo: !passwordless,
      offerFormat: needsFormat,
    })
  }

  function selectVolume(vol: StorageVolumeOption) {
    if (vol.isCurrent) return
    setSelectedUnmounted(null)
    setSelected((prev) => (prev?.id === vol.id ? null : vol))
  }

  function selectUnmounted(device: UnmountedBlockDevice | null) {
    setSelected(null)
    setSelectedUnmounted(device)
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
  const transferOptions =
    volumesData?.migrationTargets ?? volumes.filter((v) => !v.isCurrent && !v.sameDiskAsCurrent)
  const unmountedDevices = volumesData?.unmountedDevices ?? []
  const blockDisks = volumesData?.blockDisks ?? []
  const deviceContext = volumesData?.currentDeviceContext ?? null
  const isDocker = volumesData?.isDockerRuntime ?? false
  const showVolumesSkeleton = volumesWaiting && volumes.length === 0 && unmountedDevices.length === 0
  const scanningVolumes = volumesWaiting && !volumesData
  const volumesErrorText = suppressFetchErrorWhenOffline(serverReachable, volumesError)
  const active = migrateStatus?.active ?? false
  const job = migrateStatus?.job
  const transferTarget = selected && !selected.isCurrent ? selected : null
  const currentVolume = volumes.find((v) => v.isCurrent)
  const panelBusy = active || transferring || volumesRefreshing
  const transferHint = deviceContext?.filesystemTotalBytes
    ? `Tap a mounted drive on its own disk. The ${formatBytes(deviceContext.filesystemTotalBytes)} system partition is not listed here.`
    : "Tap a mounted drive with its own disk space. System folders are not listed."

  return (
    <AdminSettingsGate feature="Attach disk">
      <div className="flex flex-col gap-5">
        {volumesOffline ? (
          <OfflineCachedNotice revalidating={volumesRefreshing} />
        ) : null}

        {currentVolume ? (
          <CurrentStorageCard
            volume={currentVolume}
            usageBytes={usage?.usageBytes}
            deviceContext={deviceContext}
          />
        ) : null}

        {active && job ? (
          <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-3.5">
            <div className="mb-2.5 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-[#222222]">Transfer in progress</span>
              <span className="text-accent tabular-nums font-semibold">{job.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#ececec]">
              <div
                className="accent-progress-fill h-full rounded-full transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-[#a0a0a0]">
              Do not stop the API or worker until this completes.
            </p>
          </div>
        ) : null}

        {job?.status === "FAILED" && job.error ? (
          <MutedPanelError error={job.error} />
        ) : null}

        {scanningVolumes ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-3 text-[12px] text-[#717171]">
            <Loader2 className="size-4 animate-spin" />
            Scanning drives…
          </div>
        ) : null}

        <UnmountedDrivesBlock
          devices={unmountedDevices}
          disabled={panelBusy}
          selectedId={selectedUnmounted?.id ?? null}
          onSelect={selectUnmounted}
          isDocker={isDocker}
        />

        {unmountedDevices.length === 0 && !scanningVolumes ? (
          <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-[#fafafa] px-3.5 py-3.5">
            <p className="text-[11px] leading-relaxed text-[#717171]">
              No extra drives waiting to mount. Plug in a USB or SD card, then tap Rescan in step 2
              or under Physical disks.
            </p>
          </div>
        ) : null}

        {selectedUnmounted && !isDocker ? (
          <button
            type="button"
            disabled={active || transferring || Boolean(mountingId)}
            onClick={() => handleMountClick(selectedUnmounted)}
            className="btn-accent-solid flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold disabled:opacity-50"
          >
            {mountingId === selectedUnmounted.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <HardDrive className="size-4" />
            )}
            Mount {selectedUnmounted.device}
          </button>
        ) : null}

        {selectedUnmounted && !transferTarget ? (
          <p className="text-accent text-[11px] leading-relaxed">
            After mount, select the drive in step 2 and tap Transfer.
          </p>
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

        <TransferTargetsBlock
          options={transferOptions}
          selectedId={transferTarget?.id ?? null}
          disabled={panelBusy}
          loading={showVolumesSkeleton}
          errorText={volumesErrorText}
          hint={transferHint}
          onSelect={selectVolume}
          onRescan={() => reloadVolumes()}
          rescanning={volumesRefreshing}
        />

        {transferTarget && !active ? (
          <div className="accent-highlight-box rounded-xl px-3.5 py-3">
            <p className="text-[11px] leading-relaxed text-[#222222]">
              Selected destination:{" "}
              <span className="font-mono text-[10px]">{transferTarget.arciinPath}</span>
            </p>
          </div>
        ) : null}

        <PhysicalDisksInfo
          disks={blockDisks}
          volumes={volumes}
          onRescan={() => reloadVolumes()}
          rescanning={volumesRefreshing}
          disabled={panelBusy}
        />

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
          <p className="text-[11px] leading-relaxed text-[#717171]">
            Only the instance owner can start a full library transfer. Admins can mount drives and
            rescan volumes.
          </p>
        ) : (
          <p className="text-[10px] leading-relaxed text-[#a0a0a0]">
            Copies libraries to the selected drive. Paths update automatically. Original data is
            never deleted.
          </p>
        )}

        {migrateError ? <MutedPanelError error={migrateError} /> : null}

        <PanelStatusBanner message={message} />
      </div>
    </AdminSettingsGate>
  )
}
