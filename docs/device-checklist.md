# Device test checklist

Run each item on every device. Mark pass or fail.

## iOS Safari
- [ ] Page opens over HTTPS
- [ ] Start Camera shows the permission prompt; video appears (no full-screen takeover)
- [ ] Text QR and URL QR are read correctly
- [ ] Page item is filled and the camera stops
- [ ] Send Safari to background and return: camera is stopped
- [ ] Deny permission: red error message shows; after allowing in Settings, it works

## Android Chrome
- [ ] Rear camera is used by default
- [ ] Printed QR and phone-screen QR both work
- [ ] Long payload is kept completely
- [ ] Switch Camera works
- [ ] Permission denied shows an error
- [ ] Camera used by another app shows an error

## Desktop (Chrome, Edge, Firefox)
- [ ] Webcam is used when no rear camera exists
- [ ] Phone-screen QR and printed QR work
- [ ] Stop and restart works
- [ ] Open over plain HTTP: "requires HTTPS" message shows
