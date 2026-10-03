/*!
 * APEX QR Scanner Plugin - scanner engine
 * Copyright (c) 2026 Vihen - MIT License
 * Uses jsQR (Apache-2.0) for decoding.
 */
(function (window, document, apex) {
    "use strict";

    var NS = window.APEXQRScanner = window.APEXQRScanner || {};
    var instances = {};

    var CONFIG = {
        scanInterval: 125,      // ~8 decodes per second
        maxWidth: 640,
        maxHeight: 480,
        duplicateCooldown: 1500 // ms
    };

    function getErrorMessage(error) {
        var messages = {
            NotAllowedError: "Camera permission denied. Allow camera access in your browser settings and try again.",
            PermissionDeniedError: "Camera permission denied. Allow camera access and try again.",
            NotFoundError: "No camera was found on this device.",
            DevicesNotFoundError: "No camera was found on this device.",
            NotReadableError: "The camera is in use by another app or cannot be accessed.",
            TrackStartError: "The camera could not be started.",
            OverconstrainedError: "The requested camera is unavailable.",
            SecurityError: "Camera access is blocked by browser security settings."
        };
        var name = (error && error.name) || "Unknown error";
        return messages[name] || ("Unable to start the camera: " + ((error && error.message) || name));
    }

    function Scanner(root, options) {
        var self = this;
        this.root = root;
        this.options = options;

        this.video = root.querySelector(".aqr-video");
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

        this.status = root.querySelector(".aqr-status");
        this.error = root.querySelector(".aqr-error");
        this.startButton = root.querySelector(".aqr-start");
        this.stopButton = root.querySelector(".aqr-stop");
        this.switchButton = root.querySelector(".aqr-switch");

        this.stream = null;
        this.raf = null;
        this.lastScan = 0;
        this.lastValue = null;
        this.lastValueAt = 0;
        this.running = false;
        this.starting = false;
        this.destroyed = false;
        this.busy = false;

        this.onVisibility = function () {
            if (document.hidden && self.running) {
                self.stop();
                self.setStatus("Camera paused while page is hidden");
            }
        };
        this.onStart = function () { self.start(); };
        this.onStop = function () { self.stop(); };
        this.onSwitch = function () { self.switchCamera(); };
        this.loop = function (ts) { self.scanLoop(ts); };

        this.startButton.addEventListener("click", this.onStart);
        this.stopButton.addEventListener("click", this.onStop);
        this.switchButton.addEventListener("click", this.onSwitch);
        document.addEventListener("visibilitychange", this.onVisibility);
        window.addEventListener("pagehide", this.onStop);

        this.setStatus("Ready to scan");
    }

    Scanner.prototype.setStatus = function (message) {
        this.status.textContent = message;
    };

    Scanner.prototype.setError = function (message) {
        this.error.textContent = message || "";
        this.error.hidden = !message;
    };

    Scanner.prototype.stopTracks = function () {
        if (this.stream) {
            this.stream.getTracks().forEach(function (t) { t.stop(); });
            this.stream = null;
        }
        this.video.srcObject = null;
    };

    Scanner.prototype.stop = function () {
        this.running = false;
        if (this.raf !== null) {
            cancelAnimationFrame(this.raf);
            this.raf = null;
        }
        this.stopTracks();
        this.startButton.hidden = false;
        this.stopButton.hidden = true;
        if (!this.destroyed) {
            this.setStatus("Camera stopped");
        }
    };

    Scanner.prototype.start = async function () {
        if (this.destroyed || this.running || this.starting) return;

        this.setError("");

        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.setError("Camera access requires HTTPS (or localhost) and a supported browser.");
            return;
        }

        this.starting = true;
        this.stopTracks();
        this.setStatus("Requesting camera permission...");
        this.startButton.disabled = true;
        this.switchButton.disabled = true;

        var mode = this.options.facingMode === "user" ? "user" : "environment";
        var attempts = [
            { audio: false, video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            { audio: false, video: true }
        ];

        var stream = null;
        var lastError = null;

        for (var i = 0; i < attempts.length; i++) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
                break;
            } catch (err) {
                lastError = err;
                if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "SecurityError")) {
                    break;
                }
            }
        }

        this.starting = false;
        this.startButton.disabled = false;
        this.switchButton.disabled = false;

        if (!stream) {
            this.setError(getErrorMessage(lastError));
            this.setStatus("Camera unavailable");
            return;
        }

        if (this.destroyed) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            return;
        }

        this.stream = stream;
        this.video.setAttribute("playsinline", "");
        this.video.muted = true;
        this.video.srcObject = stream;

        try {
            await this.video.play();
        } catch (err) {
            this.stop();
            this.setError("The camera opened, but video playback was blocked. Tap Start Camera again.");
            return;
        }

        this.running = true;
        this.startButton.hidden = true;
        this.stopButton.hidden = false;
        this.setStatus("Scanning for QR code...");
        this.raf = requestAnimationFrame(this.loop);
    };

    Scanner.prototype.scanLoop = function (timestamp) {
        if (!this.running || this.destroyed) return;

        // Region or dialog removed from the page: clean up.
        if (!document.body.contains(this.root)) {
            this.destroy();
            return;
        }

        this.raf = requestAnimationFrame(this.loop);

        if (this.busy || (timestamp - this.lastScan) < CONFIG.scanInterval) return;

        var v = this.video;
        if (v.readyState < 2 || !v.videoWidth || !v.videoHeight) return;

        this.lastScan = timestamp;
        this.busy = true;

        try {
            var scale = Math.min(1, CONFIG.maxWidth / v.videoWidth, CONFIG.maxHeight / v.videoHeight);
            var w = Math.max(1, Math.round(v.videoWidth * scale));
            var h = Math.max(1, Math.round(v.videoHeight * scale));

            if (this.canvas.width !== w || this.canvas.height !== h) {
                this.canvas.width = w;
                this.canvas.height = h;
            }

            this.ctx.drawImage(v, 0, 0, w, h);
            var image = this.ctx.getImageData(0, 0, w, h);
            var result = window.jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });

            if (result && result.data) {
                this.onDetected(result.data);
            }
        } catch (err) {
            console.error("APEX QR Scanner:", err);
        } finally {
            this.busy = false;
        }
    };

    Scanner.prototype.onDetected = function (value) {
        var now = Date.now();
        if (value === this.lastValue && (now - this.lastValueAt) < CONFIG.duplicateCooldown) return;
        this.lastValue = value;
        this.lastValueAt = now;

        if (this.options.stopAfterScan) {
            this.stop();
        }

        this.setStatus("QR code detected");
        this.setError("");

        var item = apex.item(this.options.targetItem);
        if (!item || !item.node) {
            this.setError("The target page item was not found: " + this.options.targetItem);
            return;
        }

        // Fires the item's own change event, so Dynamic Actions on the item also work.
        item.setValue(value);

        // Custom event for Dynamic Actions. Bubbles up to the region element.
        // In a DA "Execute JavaScript Code" action, use this.data.value
        apex.event.trigger(this.root, "qr-scanned", {
            value: value,
            item: this.options.targetItem,
            regionId: this.options.regionId
        });
    };

    Scanner.prototype.switchCamera = async function () {
        this.options.facingMode = this.options.facingMode === "user" ? "environment" : "user";
        if (this.running) {
            this.stop();
            await this.start();
        }
    };

    Scanner.prototype.destroy = function () {
        if (this.destroyed) return;
        this.stop();
        this.destroyed = true;
        document.removeEventListener("visibilitychange", this.onVisibility);
        window.removeEventListener("pagehide", this.onStop);
        this.startButton.removeEventListener("click", this.onStart);
        this.stopButton.removeEventListener("click", this.onStop);
        this.switchButton.removeEventListener("click", this.onSwitch);
        delete instances[this.root.id];
    };

    // rootId = id of the inner scanner div; options = { targetItem, facingMode, stopAfterScan, regionId }
    NS.init = function (rootId, options) {
        var root = document.getElementById(rootId);
        if (!root) return;

        if (instances[rootId]) {
            instances[rootId].destroy();
        }

        if (typeof window.jsQR !== "function") {
            var err = root.querySelector(".aqr-error");
            err.textContent = "QR decoder library failed to load. Check the plug-in files (jsQR.js).";
            err.hidden = false;
            return;
        }

        instances[rootId] = new Scanner(root, options);
    };

    NS.destroy = function (rootId) {
        if (instances[rootId]) instances[rootId].destroy();
    };

})(window, document, apex);
