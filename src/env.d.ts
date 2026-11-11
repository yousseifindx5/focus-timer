interface Window {
  api?: {
    platform: string
    compact: (on: boolean, top: boolean) => void
    top: (v: boolean) => void
    flash: () => void
  }
}
