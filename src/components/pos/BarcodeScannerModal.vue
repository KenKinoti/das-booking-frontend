<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.8);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-upc-scan me-2"></i>
            Barcode Scanner
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="$emit('close')"></button>
        </div>
        <div class="modal-body text-center">
          <!-- Camera Preview -->
          <div class="scanner-container mb-4">
            <video
              ref="video"
              class="scanner-video"
              autoplay
              muted
              playsinline
            ></video>
            <div class="scanner-overlay">
              <div class="scanner-frame">
                <div class="corner top-left"></div>
                <div class="corner top-right"></div>
                <div class="corner bottom-left"></div>
                <div class="corner bottom-right"></div>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div class="mb-3">
            <div v-if="scanning" class="alert alert-info">
              <i class="bi bi-camera me-2"></i>
              Position barcode within the frame
            </div>
            <div v-else-if="error" class="alert alert-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ error }}
            </div>
            <div v-else class="alert alert-secondary">
              <i class="bi bi-camera-off me-2"></i>
              Scanner not active
            </div>
          </div>

          <!-- Manual Input Fallback -->
          <div class="row">
            <div class="col-md-8 mx-auto">
              <div class="mb-3">
                <label class="form-label">Or enter barcode manually:</label>
                <div class="input-group">
                  <input
                    type="text"
                    class="form-control"
                    v-model="manualBarcode"
                    @keyup.enter="processManualBarcode"
                    placeholder="Enter barcode or SKU"
                    ref="manualInput"
                  >
                  <button
                    class="btn btn-outline-primary"
                    @click="processManualBarcode"
                    :disabled="!manualBarcode.trim()"
                  >
                    <i class="bi bi-search"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Scans -->
          <div v-if="recentScans.length > 0">
            <h6>Recent Scans:</h6>
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              <span
                v-for="scan in recentScans.slice(0, 5)"
                :key="scan"
                class="badge bg-secondary"
              >
                {{ scan }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="toggleScanner"
          >
            <i :class="scanning ? 'bi bi-stop' : 'bi bi-play'"></i>
            {{ scanning ? 'Stop Scanner' : 'Start Scanner' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BarcodeScannerModal',
  emits: ['close', 'barcode-scanned'],
  data() {
    return {
      scanning: false,
      error: null,
      stream: null,
      manualBarcode: '',
      recentScans: [],
      lastScanTime: 0,
      detectionWorker: null
    }
  },
  async mounted() {
    this.loadRecentScans()
    await this.initializeScanner()
  },
  beforeUnmount() {
    this.stopScanner()
  },
  methods: {
    async initializeScanner() {
      try {
        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported by this browser')
        }

        // Request camera permission
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera if available
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })

        this.$refs.video.srcObject = this.stream
        this.scanning = true
        this.error = null

        // Start barcode detection
        this.startBarcodeDetection()

      } catch (error) {
        console.error('Camera initialization failed:', error)
        this.error = 'Unable to access camera. Please ensure camera permissions are granted.'
        this.scanning = false

        // Focus manual input as fallback
        this.$nextTick(() => {
          this.$refs.manualInput?.focus()
        })
      }
    },

    startBarcodeDetection() {
      // Simulate barcode detection since we don't have a real barcode library
      // In a real implementation, you would use a library like ZXing or QuaggaJS

      this.detectionInterval = setInterval(() => {
        if (this.scanning && this.$refs.video.readyState === 4) {
          // Simulate random barcode detection for demo
          if (Math.random() < 0.1) { // 10% chance per check
            const mockBarcodes = [
              '1234567890123',
              '9876543210987',
              'ENG-OIL-5W30',
              'BRK-PAD-FRT'
            ]
            const mockBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)]
            this.processBarcodeResult(mockBarcode)
          }
        }
      }, 1000)
    },

    stopScanner() {
      this.scanning = false

      if (this.detectionInterval) {
        clearInterval(this.detectionInterval)
        this.detectionInterval = null
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null
      }
    },

    toggleScanner() {
      if (this.scanning) {
        this.stopScanner()
      } else {
        this.initializeScanner()
      }
    },

    processBarcodeResult(barcode) {
      const now = Date.now()

      // Prevent duplicate scans within 2 seconds
      if (now - this.lastScanTime < 2000) return

      this.lastScanTime = now

      // Add to recent scans
      if (!this.recentScans.includes(barcode)) {
        this.recentScans.unshift(barcode)
        if (this.recentScans.length > 10) {
          this.recentScans = this.recentScans.slice(0, 10)
        }
        this.saveRecentScans()
      }

      // Emit barcode result
      this.$emit('barcode-scanned', barcode)
    },

    processManualBarcode() {
      if (!this.manualBarcode.trim()) return

      this.processBarcodeResult(this.manualBarcode.trim())
      this.manualBarcode = ''
    },

    loadRecentScans() {
      try {
        const saved = localStorage.getItem('recentBarcodeScans')
        if (saved) {
          this.recentScans = JSON.parse(saved)
        }
      } catch (error) {
        console.error('Error loading recent scans:', error)
        this.recentScans = []
      }
    },

    saveRecentScans() {
      try {
        localStorage.setItem('recentBarcodeScans', JSON.stringify(this.recentScans))
      } catch (error) {
        console.error('Error saving recent scans:', error)
      }
    }
  }
}
</script>

<style scoped>
.scanner-container {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.scanner-video {
  width: 100%;
  height: 300px;
  object-fit: cover;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-frame {
  position: relative;
  width: 250px;
  height: 150px;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #00ff00;
}

.corner.top-left {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.corner.top-right {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.corner.bottom-left {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
}

.corner.bottom-right {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
}

.modal-content {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
}

.modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.alert {
  margin-bottom: 0;
}

.badge {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.badge:hover {
  transform: scale(1.05);
}
</style>