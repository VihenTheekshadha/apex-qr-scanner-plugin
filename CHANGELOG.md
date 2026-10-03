# Changelog

## 1.0.0
- First release.
- Region plug-in: camera preview, QR decoding with jsQR, writes result to a page item.
- Attributes: Target Page Item, Camera Facing (rear/front), Stop After Scan.
- Custom event `qr-scanned` for Dynamic Actions (value in `this.data.value`).
- Stops camera on page hide, page unload, and when the region is removed.
- Clear on-screen errors: permission denied, no camera, camera busy, non-HTTPS.
