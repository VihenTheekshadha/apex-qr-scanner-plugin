# APEX QR Scanner Plugin

A free, reusable **Oracle APEX region plug-in** that scans QR codes with the device camera and writes the result into a page item. It runs fully in the browser: no extra server, no ORDS endpoint, no CDN.

By **Vihen Theekshadha** - MIT License.

## Features
- Camera preview inside any APEX page
- Reads text, URLs and numbers from QR codes
- Writes the result into a page item you choose
- Custom event `qr-scanned` for Dynamic Actions
- Rear or front camera, with automatic fallback (for example a laptop webcam)
- Option to stop the camera after the first successful scan
- Stops the camera when the page is hidden, closed, or the region is removed
- Clear error messages inside the region (permission denied, no camera, camera busy, not HTTPS)
- Decoder (jsQR) is bundled, so there is no external dependency

## Requirements
- Oracle APEX 26.1 (tested on 26.1.5, Autonomous Database)
- The page must be served over **HTTPS** (browsers block camera access otherwise)
- Other APEX versions (24.2 and later) may work but are **not tested**

## Install
### Option A: import the export file
1. Download the plug-in export from `plugin/`.
2. Shared Components > Plug-ins > **Import**, then follow the wizard.

### Option B: build it by hand (about 10 minutes)
1. Shared Components > Plug-ins > **Create** > From Scratch.
   - Name: `APEX QR Scanner`, Type: **Region**
   - Render Procedure/Function Name: `render_region`
   - Source: paste `src/plsql/render_region.sql`
2. **Files** > Create File. Use these directories and names:
   - `js` / `jsQR.js`
   - `js` / `qr-scanner.js`
   - `css` / `qr-scanner.css`
3. **Custom Attributes**:

   | Static ID | Label | Type | Default |
   |---|---|---|---|
   | `target-item` | Target Page Item | Page Item (required) | |
   | `camera-facing` | Camera Facing | Select List: `Rear Camera`=`environment`, `Front Camera`=`user` | `environment` |
   | `stop-after-scan` | Stop After Scan | Yes/No | `Y` |

4. **Events**: Name `QR Scanned`, Internal Name `qr-scanned`.

## Use
1. Add a Text Field page item (for example `P10_QR_RESULT`).
2. Add a region of type **APEX QR Scanner** and set the three attributes.
3. Optional: add a Dynamic Action on event **QR Scanned** and read `this.data.value`.

See [docs/test-page.md](docs/test-page.md) for a full test recipe.

## Security note
A QR code is only text from the user's device. Do not trust it by itself. For attendance, tickets or payments, always check the value on the server (database lookup or a signed token) and enforce one-time use there.

## Browser support
Designed for iOS Safari, Android Chrome and desktop browsers with a webcam. Tested on APEX 26.1.5 in a desktop browser and on iOS (works). Android Chrome test reports are welcome: see [docs/device-checklist.md](docs/device-checklist.md) and open an issue with your results.

## Troubleshooting
| Problem | Check |
|---|---|
| "QR decoder library failed to load" | File names and directories in the plug-in Files list (Network tab shows 404) |
| "requires HTTPS" | Open the app over `https://` |
| Camera permission denied | Allow camera in browser site settings, then press Start Camera again |
| Region shows a PL/SQL error | Render Procedure name must be `render_region`; Static IDs must match exactly |
| Dynamic Action does not fire | Event must be `QR Scanned` (internal name `qr-scanned`) and the region must be selected |

## Roadmap
Ideas for later versions: torch button, beep/vibrate, translatable labels, camera picker, auto-start, frame styling.

## Credits
- QR decoding by [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0), see [NOTICE.md](NOTICE.md)

## License
[MIT](LICENSE) - free for personal and commercial use. Please keep the copyright notice.
