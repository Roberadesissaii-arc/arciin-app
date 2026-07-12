"use client"

import { useCallback, useEffect, useRef } from "react"
import { Check } from "lucide-react"

import { AssetThumbnail } from "@/components/files/asset-thumbnail"
import {
  ASSET_LONG_PRESS_MS,
  ASSET_MOVE_THRESHOLD_PX,
  ASSET_TAP_MAX_MS,
  assetIdFromPoint,
  assetIndexFromId,
  assetRangeSelection,
  toggleAssetSelection,
} from "@/lib/files/asset-grid-selection"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"
import { formatBytes } from "@/lib/utils/format-bytes"
import { cn } from "@/lib/utils"

type ActiveGesture = {
  pointerId: number
  startX: number
  startY: number
  startTime: number
  anchorIndex: number
  armed: boolean
  dragSelect: boolean
  toggleOnly?: boolean
}

type MobileAssetGridProps = {
  assets: AssetSummary[]
  connection: MobileConnection
  documentThumbnailsEnabled: boolean
  selectionMode: boolean
  selectedIds: Set<string>
  onSelectionModeChange: (active: boolean) => void
  onSelectedIdsChange: (ids: Set<string>) => void
  onOpen: (index: number) => void
}

export function MobileAssetGrid({
  assets,
  connection,
  documentThumbnailsEnabled,
  selectionMode,
  selectedIds,
  onSelectionModeChange,
  onSelectedIdsChange,
  onOpen,
}: MobileAssetGridProps) {
  const gestureRef = useRef<ActiveGesture | null>(null)
  const timerRef = useRef<number | null>(null)
  const selectedIdsRef = useRef(selectedIds)
  const selectionModeRef = useRef(selectionMode)

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  useEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const cleanupWindowListeners = useCallback((move: (e: PointerEvent) => void, up: (e: PointerEvent) => void) => {
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
    window.removeEventListener("pointercancel", up)
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, index: number) => {
      if (event.button !== 0) return

      const asset = assets[index]
      if (!asset) return

      if (selectionModeRef.current) {
        gestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startTime: Date.now(),
          anchorIndex: index,
          armed: false,
          dragSelect: false,
          toggleOnly: true,
        }

        const onPointerUp = (e: PointerEvent) => {
          const gesture = gestureRef.current
          if (!gesture || gesture.pointerId !== e.pointerId) return
          cleanupWindowListeners(onPointerMove, onPointerUp)
          clearTimer()
          gestureRef.current = null

          const dist = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)
          const elapsed = Date.now() - gesture.startTime
          if (elapsed < ASSET_TAP_MAX_MS && dist < ASSET_MOVE_THRESHOLD_PX) {
            onSelectedIdsChange(toggleAssetSelection(selectedIdsRef.current, asset.id))
          }
        }

        const onPointerMove = () => {}

        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)
        return
      }

      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: Date.now(),
        anchorIndex: index,
        armed: false,
        dragSelect: false,
      }

      const onPointerMove = (e: PointerEvent) => {
        const gesture = gestureRef.current
        if (!gesture || gesture.pointerId !== e.pointerId) return

        const dist = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)

        if (!gesture.armed && dist > ASSET_MOVE_THRESHOLD_PX) {
          clearTimer()
          return
        }

        if (gesture.armed) {
          if (dist > ASSET_MOVE_THRESHOLD_PX) gesture.dragSelect = true
          if (gesture.dragSelect) {
            const hoveredId = assetIdFromPoint(e.clientX, e.clientY)
            if (!hoveredId) return
            const hoveredIndex = assetIndexFromId(assets, hoveredId)
            if (hoveredIndex < 0) return
            if (!selectionModeRef.current) onSelectionModeChange(true)
            onSelectedIdsChange(assetRangeSelection(assets, gesture.anchorIndex, hoveredIndex))
          }
        }
      }

      const onPointerUp = (e: PointerEvent) => {
        const gesture = gestureRef.current
        if (!gesture || gesture.pointerId !== e.pointerId) return
        cleanupWindowListeners(onPointerMove, onPointerUp)
        clearTimer()
        gestureRef.current = null

        const dist = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)
        const elapsed = Date.now() - gesture.startTime

        if (gesture.armed) {
          if (gesture.dragSelect || selectedIdsRef.current.size > 1) {
            onSelectionModeChange(true)
            return
          }
          onSelectionModeChange(true)
          onSelectedIdsChange(new Set([assets[gesture.anchorIndex]!.id]))
          return
        }

        if (elapsed < ASSET_TAP_MAX_MS && dist < ASSET_MOVE_THRESHOLD_PX) {
          onOpen(gesture.anchorIndex)
        }
      }

      timerRef.current = window.setTimeout(() => {
        const gesture = gestureRef.current
        if (!gesture || gesture.pointerId !== event.pointerId) return
        gesture.armed = true
      }, ASSET_LONG_PRESS_MS)

      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp)
      window.addEventListener("pointercancel", onPointerUp)
    },
    [
      assets,
      cleanupWindowListeners,
      clearTimer,
      onOpen,
      onSelectedIdsChange,
      onSelectionModeChange,
    ],
  )

  useEffect(() => () => clearTimer(), [clearTimer])

  return (
    <div className="grid grid-cols-2 gap-3" data-asset-grid>
      {assets.map((asset, index) => {
        const selected = selectedIds.has(asset.id)
        const label = asset.title?.trim() || asset.originalFilename
        return (
          <div
            key={asset.id}
            data-asset-id={asset.id}
            role="button"
            tabIndex={0}
            onPointerDown={(event) => handlePointerDown(event, index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                if (selectionMode) {
                  onSelectedIdsChange(toggleAssetSelection(selectedIds, asset.id))
                } else {
                  onOpen(index)
                }
              }
            }}
            className={cn(
              "relative overflow-hidden rounded-2xl bg-white p-2 text-left shadow-sm select-none touch-manipulation",
              selected ? "ring-2 ring-[#ff4f12] ring-offset-1" : "",
            )}
            style={{ border: selected ? "1px solid #ff4f12" : "1px solid #e5e5e5" }}
          >
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                if (!selectionMode) onSelectionModeChange(true)
                onSelectedIdsChange(toggleAssetSelection(selectedIds, asset.id))
              }}
              aria-label={selected ? "Deselect file" : "Select file"}
              aria-pressed={selected}
              className={cn(
                "absolute left-3 top-3 z-10 flex size-7 items-center justify-center rounded-full shadow-sm transition-colors",
                selected
                  ? "bg-accent text-white"
                  : "border border-white/80 bg-black/25 text-transparent backdrop-blur-sm",
              )}
            >
              <Check className="size-4" strokeWidth={3} />
            </button>
            <AssetThumbnail
              asset={asset}
              connection={connection}
              documentThumbnailsEnabled={documentThumbnailsEnabled}
            />
            <p className="mt-2 truncate px-0.5 text-[14px] font-semibold leading-tight text-[#222222]">
              {label}
            </p>
            <p className="mt-1 truncate px-0.5 pb-0.5 text-[11px] leading-snug text-[#a0a0a0]">
              {formatBytes(asset.sizeBytes)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
