# Test page recipe

1. Create a page (for example page 10).
2. Add a **Text Field** `P10_QR_RESULT`. Set *Value Protected* to **No**.
3. Add a **Region**. Type: **APEX QR Scanner**. Static ID: `QR_SCANNER`.
   - Target Page Item: `P10_QR_RESULT`
   - Camera Facing: Rear Camera
   - Stop After Scan: Yes
4. Add a **Dynamic Action**:
   - Event: **QR Scanned** (custom event `qr-scanned`)
   - Selection Type: Region, Region: the scanner region
   - True Action: Execute JavaScript Code
     ```js
     apex.message.showPageSuccess("QR: " + this.data.value);
     ```
5. Run the page over **HTTPS**, tap **Start Camera**, and scan a QR code.

Expected result: the camera opens, the code is read, `P10_QR_RESULT` is filled, the camera stops, and the success message shows.
