<template>
  <div class="video-call-container" :class="{ 'full-screen': isFullScreen }">
    <!-- Call Header -->
    <div class="call-header" v-if="!isFullScreen">
      <div class="call-info">
        <div class="participant-info">
          <div class="participant-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="participant-details">
            <h3 class="participant-name">{{ remoteParticipant?.name || 'Unknown User' }}</h3>
            <p class="call-status">{{ callStatus }}</p>
            <p class="call-duration" v-if="callDuration">{{ formatDuration(callDuration) }}</p>
          </div>
        </div>
        <div class="call-quality">
          <div class="quality-indicator" :class="connectionQuality">
            <i class="fas fa-signal"></i>
            <span>{{ connectionQuality }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Video Streams Container -->
    <div class="video-streams" ref="videoContainer">
      <!-- Remote Video (Main) -->
      <div class="remote-video-container" v-show="showRemoteVideo">
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          class="remote-video"
          :class="{ 'screen-share': isRemoteScreenSharing }"
        ></video>
        <div class="remote-video-overlay" v-if="isRemoteAudioMuted || isRemoteVideoMuted">
          <div class="mute-indicators">
            <i v-if="isRemoteAudioMuted" class="fas fa-microphone-slash audio-muted"></i>
            <i v-if="isRemoteVideoMuted" class="fas fa-video-slash video-muted"></i>
          </div>
        </div>
        <div class="remote-participant-name">{{ remoteParticipant?.name }}</div>
      </div>

      <!-- Local Video (Picture-in-Picture) -->
      <div
        class="local-video-container"
        :class="{ 'dragging': isDragging }"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <video
          ref="localVideo"
          autoplay
          playsinline
          muted
          class="local-video"
        ></video>
        <div class="local-video-overlay" v-if="isAudioMuted || isVideoMuted">
          <div class="mute-indicators">
            <i v-if="isAudioMuted" class="fas fa-microphone-slash audio-muted"></i>
            <i v-if="isVideoMuted" class="fas fa-video-slash video-muted"></i>
          </div>
        </div>
        <div class="local-participant-name">You</div>
      </div>

      <!-- No Video Placeholder -->
      <div class="no-video-placeholder" v-if="!showRemoteVideo && callStatus === 'connected'">
        <div class="placeholder-content">
          <div class="participant-avatar large">
            <i class="fas fa-user"></i>
          </div>
          <h3>{{ remoteParticipant?.name || 'Remote Participant' }}</h3>
          <p>Camera is off</p>
        </div>
      </div>
    </div>

    <!-- Call Controls -->
    <div class="call-controls">
      <div class="control-buttons">
        <!-- Audio Toggle -->
        <button
          class="control-btn audio-btn"
          :class="{ 'muted': isAudioMuted }"
          @click="toggleAudio"
          :title="isAudioMuted ? 'Unmute' : 'Mute'"
        >
          <i :class="isAudioMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'"></i>
        </button>

        <!-- Video Toggle -->
        <button
          class="control-btn video-btn"
          :class="{ 'muted': isVideoMuted }"
          @click="toggleVideo"
          :title="isVideoMuted ? 'Turn on camera' : 'Turn off camera'"
        >
          <i :class="isVideoMuted ? 'fas fa-video-slash' : 'fas fa-video'"></i>
        </button>

        <!-- Screen Share -->
        <div class="control-group">
          <button
            class="control-btn screen-btn"
            :class="{ 'active': isScreenSharing }"
            @click="isScreenSharing ? toggleScreenShare() : showScreenShareOptions = true"
            :title="isScreenSharing ? 'Stop sharing' : 'Share screen'"
          >
            <i class="fas fa-desktop"></i>
          </button>
          <button
            v-if="!isScreenSharing"
            class="control-btn-small screen-options-btn"
            @click="showScreenShareOptions = true"
            title="Screen share options"
          >
            <i class="fas fa-cog"></i>
          </button>
        </div>

        <!-- Recording -->
        <div class="control-group" v-if="canRecord">
          <button
            class="control-btn record-btn"
            :class="{ 'recording': isRecording }"
            @click="isRecording ? toggleRecording() : showRecordingOptions = true"
            :title="isRecording ? 'Stop recording' : 'Start recording'"
          >
            <i class="fas fa-circle"></i>
          </button>
          <button
            v-if="!isRecording"
            class="control-btn-small record-options-btn"
            @click="showRecordingOptions = true"
            title="Recording options"
          >
            <i class="fas fa-cog"></i>
          </button>
        </div>

        <!-- Settings -->
        <button
          class="control-btn settings-btn"
          @click="showSettings = !showSettings"
          title="Settings"
        >
          <i class="fas fa-cog"></i>
        </button>

        <!-- Full Screen -->
        <button
          class="control-btn fullscreen-btn"
          @click="toggleFullScreen"
          :title="isFullScreen ? 'Exit full screen' : 'Full screen'"
        >
          <i :class="isFullScreen ? 'fas fa-compress' : 'fas fa-expand'"></i>
        </button>

        <!-- End Call -->
        <button
          class="control-btn end-call-btn"
          @click="endCall"
          title="End call"
        >
          <i class="fas fa-phone-slash"></i>
        </button>
      </div>

      <!-- Call Timer -->
      <div class="call-timer" v-if="callDuration">
        {{ formatDuration(callDuration) }}
      </div>
    </div>

    <!-- Settings Panel -->
    <div class="settings-panel" v-if="showSettings">
      <div class="settings-content">
        <h3>Call Settings</h3>

        <!-- Camera Selection -->
        <div class="setting-group">
          <label>Camera</label>
          <select v-model="selectedCamera" @change="switchCamera">
            <option v-for="camera in availableCameras" :key="camera.deviceId" :value="camera.deviceId">
              {{ camera.label || `Camera ${camera.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>

        <!-- Microphone Selection -->
        <div class="setting-group">
          <label>Microphone</label>
          <select v-model="selectedMicrophone" @change="switchMicrophone">
            <option v-for="mic in availableMicrophones" :key="mic.deviceId" :value="mic.deviceId">
              {{ mic.label || `Microphone ${mic.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>

        <!-- Video Quality -->
        <div class="setting-group">
          <label>Video Quality</label>
          <select v-model="videoQuality" @change="updateVideoQuality">
            <option value="sd">SD (480p)</option>
            <option value="hd">HD (720p)</option>
            <option value="fhd">Full HD (1080p)</option>
          </select>
        </div>

        <!-- Background Effects -->
        <div class="setting-group">
          <label>Background</label>
          <div class="background-options">
            <button
              class="bg-option"
              :class="{ 'active': backgroundEffect === 'none' }"
              @click="setBackgroundEffect('none')"
            >
              None
            </button>
            <button
              class="bg-option"
              :class="{ 'active': backgroundEffect === 'blur' }"
              @click="setBackgroundEffect('blur')"
            >
              Blur
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pre-Call Setup Modal -->
    <div class="pre-call-modal" v-if="showPreCallModal">
      <div class="modal-content pre-call-content">
        <div class="modal-header">
          <h3><i class="fas fa-video"></i> Start Video Call</h3>
          <p>Select participants and configure your settings</p>
        </div>

        <!-- Participants Selection -->
        <div class="participants-section">
          <div class="section-header">
            <h4><i class="fas fa-users"></i> Invite Participants <span class="optional-text">(Optional)</span></h4>
            <span class="participant-count">
              <span v-if="selectedParticipants.length === 0">Solo recording mode</span>
              <span v-else>{{ selectedParticipants.length }} selected</span>
            </span>
          </div>

          <div class="participant-search">
            <div class="search-input-wrapper">
              <i class="fas fa-search search-icon"></i>
              <input
                type="text"
                v-model="participantSearchQuery"
                placeholder="Search contacts, teams, or email addresses..."
                class="participant-search-input"
                @input="searchParticipants"
              />
              <div class="search-suggestions" v-if="searchSuggestions.length > 0">
                <div class="suggestion-category" v-for="category in groupedSuggestions" :key="category.type">
                  <div class="category-header">
                    <i :class="category.icon"></i>
                    <span>{{ category.title }}</span>
                  </div>
                  <div
                    class="suggestion-item"
                    v-for="participant in category.items"
                    :key="participant.id"
                    @click="addParticipant(participant)"
                    :class="{ 'selected': isParticipantSelected(participant) }"
                  >
                    <div class="participant-avatar">
                      <img v-if="participant.avatar" :src="participant.avatar" :alt="participant.name" />
                      <div v-else class="avatar-placeholder" :style="{ backgroundColor: participant.color }">
                        {{ getInitials(participant.name) }}
                      </div>
                      <div class="online-indicator" v-if="participant.isOnline"></div>
                    </div>
                    <div class="participant-info">
                      <div class="participant-name">{{ participant.name }}</div>
                      <div class="participant-detail">
                        <span class="role">{{ participant.role }}</span>
                        <span class="status" :class="participant.status">{{ participant.status }}</span>
                      </div>
                    </div>
                    <div class="participant-actions">
                      <i class="fas fa-plus" v-if="!isParticipantSelected(participant)"></i>
                      <i class="fas fa-check" v-else></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected Participants -->
          <div class="selected-participants" v-if="selectedParticipants.length > 0">
            <div class="participant-chips">
              <div
                class="participant-chip"
                v-for="participant in selectedParticipants"
                :key="participant.id"
              >
                <div class="chip-avatar">
                  <img v-if="participant.avatar" :src="participant.avatar" :alt="participant.name" />
                  <div v-else class="avatar-placeholder" :style="{ backgroundColor: participant.color }">
                    {{ getInitials(participant.name) }}
                  </div>
                </div>
                <span class="chip-name">{{ participant.name }}</span>
                <button class="remove-chip" @click="removeParticipant(participant)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Video Preview -->
        <div class="pre-call-video-preview">
          <video
            ref="preCallVideo"
            autoplay
            playsinline
            muted
            class="preview-video"
          ></video>
          <div class="preview-overlay" v-if="preCallVideoMuted">
            <div class="preview-placeholder">
              <i class="fas fa-video-slash"></i>
              <p>Camera is off</p>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div class="pre-call-settings">
          <div class="setting-row">
            <label><i class="fas fa-camera"></i> Camera</label>
            <select v-model="preCallCamera" @change="updatePreCallCamera">
              <option v-for="camera in availableCameras" :key="camera.deviceId" :value="camera.deviceId">
                {{ camera.label || `Camera ${camera.deviceId.slice(0, 8)}` }}
              </option>
            </select>
          </div>

          <div class="setting-row">
            <label><i class="fas fa-microphone"></i> Microphone</label>
            <select v-model="preCallMicrophone" @change="updatePreCallMicrophone">
              <option v-for="mic in availableMicrophones" :key="mic.deviceId" :value="mic.deviceId">
                {{ mic.label || `Microphone ${mic.deviceId.slice(0, 8)}` }}
              </option>
            </select>
          </div>

          <div class="call-type-selection">
            <label><i class="fas fa-cog"></i> Call Type</label>
            <div class="call-type-options">
              <button
                class="call-type-btn"
                :class="{ 'active': callType === 'video' }"
                @click="callType = 'video'"
              >
                <i class="fas fa-video"></i>
                Video Call
              </button>
              <button
                class="call-type-btn"
                :class="{ 'active': callType === 'audio' }"
                @click="callType = 'audio'"
              >
                <i class="fas fa-phone"></i>
                Audio Only
              </button>
              <button
                class="call-type-btn"
                :class="{ 'active': callType === 'screen_share' }"
                @click="callType = 'screen_share'"
              >
                <i class="fas fa-desktop"></i>
                Screen Share
              </button>
            </div>
          </div>

          <div class="media-controls">
            <button
              class="media-btn"
              :class="{ 'muted': preCallVideoMuted }"
              @click="togglePreCallVideo"
            >
              <i :class="preCallVideoMuted ? 'fas fa-video-slash' : 'fas fa-video'"></i>
              {{ preCallVideoMuted ? 'Turn on camera' : 'Turn off camera' }}
            </button>

            <button
              class="media-btn"
              :class="{ 'muted': preCallAudioMuted }"
              @click="togglePreCallAudio"
            >
              <i :class="preCallAudioMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'"></i>
              {{ preCallAudioMuted ? 'Unmute microphone' : 'Mute microphone' }}
            </button>
          </div>
        </div>

        <div class="pre-call-actions">
          <button class="cancel-btn" @click="cancelCall">
            <i class="fas fa-times"></i>
            Cancel
          </button>
          <button
            class="start-call-btn"
            @click="startCall"
          >
            <i class="fas fa-video"></i>
            <span v-if="selectedParticipants.length === 0">Start Solo Recording</span>
            <span v-else>Start Call ({{ selectedParticipants.length }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Incoming Call Modal -->
    <div class="incoming-call-modal" v-if="incomingCall">
      <div class="modal-content">
        <div class="caller-info">
          <div class="caller-avatar">
            <i class="fas fa-user"></i>
          </div>
          <h3>{{ incomingCall.caller?.name || 'Unknown Caller' }}</h3>
          <p>Incoming {{ incomingCall.call_type }} call</p>
        </div>
        <div class="call-actions">
          <button class="accept-btn" @click="acceptCall">
            <i class="fas fa-phone"></i>
            Accept
          </button>
          <button class="reject-btn" @click="rejectCall">
            <i class="fas fa-phone-slash"></i>
            Reject
          </button>
        </div>
      </div>
    </div>

    <!-- Recording Indicator -->
    <div class="recording-indicator" v-if="isRecording || isRemoteRecording">
      <div class="rec-dot"></div>
      <span>REC</span>
      <span class="recording-duration" v-if="isRecording">{{ formatRecordingDuration(recordingDuration) }}</span>
    </div>

    <!-- Screen Share Indicator -->
    <div class="screen-share-indicator" v-if="isScreenSharing">
      <i class="fas fa-desktop"></i>
      <span>Sharing Screen</span>
    </div>

    <!-- Recording Options Modal -->
    <div v-if="showRecordingOptions" class="modal-overlay" @click="showRecordingOptions = false">
      <div class="modal-content recording-options-modal" @click.stop>
        <div class="modal-header">
          <h3><i class="fas fa-video"></i> Recording Options</h3>
          <button @click="showRecordingOptions = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="option-group">
            <label>Recording Quality</label>
            <select v-model="recordingQuality" class="form-select">
              <option value="720p">HD (720p)</option>
              <option value="1080p">Full HD (1080p)</option>
              <option value="1440p">2K (1440p)</option>
              <option value="2160p">4K (2160p)</option>
            </select>
          </div>
          <div class="option-group">
            <label>Include Audio</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" v-model="recordingOptions.includeMicrophone">
                <span>Microphone</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="recordingOptions.includeSystemAudio">
                <span>System Audio</span>
              </label>
            </div>
          </div>
          <div class="option-group">
            <label>Save Location</label>
            <select v-model="recordingOptions.saveLocation" class="form-select">
              <option value="local">Local Download</option>
              <option value="cloud">Cloud Storage</option>
              <option value="both">Both Local & Cloud</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showRecordingOptions = false" class="btn btn-secondary">Cancel</button>
          <button @click="startRecordingWithOptions" class="btn btn-primary">
            <i class="fas fa-circle"></i> Start Recording
          </button>
        </div>
      </div>
    </div>

    <!-- Screen Share Options Modal -->
    <div v-if="showScreenShareOptions" class="modal-overlay" @click="showScreenShareOptions = false">
      <div class="modal-content screen-share-options-modal" @click.stop>
        <div class="modal-header">
          <h3><i class="fas fa-desktop"></i> Screen Share Options</h3>
          <button @click="showScreenShareOptions = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="option-group">
            <label>Share Type</label>
            <div class="share-type-options">
              <button
                class="share-type-btn"
                :class="{ active: screenShareType === 'screen' }"
                @click="screenShareType = 'screen'"
              >
                <i class="fas fa-desktop"></i>
                <span>Entire Screen</span>
              </button>
              <button
                class="share-type-btn"
                :class="{ active: screenShareType === 'window' }"
                @click="screenShareType = 'window'"
              >
                <i class="fas fa-window-maximize"></i>
                <span>Application Window</span>
              </button>
              <button
                class="share-type-btn"
                :class="{ active: screenShareType === 'tab' }"
                @click="screenShareType = 'tab'"
              >
                <i class="fas fa-browser"></i>
                <span>Browser Tab</span>
              </button>
            </div>
          </div>
          <div class="option-group">
            <label class="checkbox-item">
              <input type="checkbox" v-model="screenShareOptions.includeAudio">
              <span>Include System Audio</span>
            </label>
          </div>
          <div class="option-group">
            <label>Quality</label>
            <select v-model="screenShareOptions.quality" class="form-select">
              <option value="720p">HD (720p)</option>
              <option value="1080p">Full HD (1080p)</option>
              <option value="1440p">2K (1440p)</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showScreenShareOptions = false" class="btn btn-secondary">Cancel</button>
          <button @click="startScreenShareWithOptions" class="btn btn-primary">
            <i class="fas fa-desktop"></i> Start Sharing
          </button>
        </div>
      </div>
    </div>

    <!-- Connection Status -->
    <div class="connection-status" v-if="connectionIssue">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ connectionIssue }}</span>
    </div>

    <!-- End Call Overlay -->
    <div v-if="showEndCallOverlay" class="end-call-overlay">
      <div class="end-call-content">
        <div class="end-call-icon">
          <i class="fas fa-phone-slash"></i>
        </div>
        <h2>Call Ended</h2>
        <p v-if="callEndReason">{{ callEndReason }}</p>
        <div class="call-summary" v-if="callDuration">
          <div class="summary-item">
            <span class="summary-label">Duration:</span>
            <span class="summary-value">{{ formatDuration(callDuration) }}</span>
          </div>
          <div class="summary-item" v-if="selectedParticipants.length > 0">
            <span class="summary-label">Participants:</span>
            <span class="summary-value">{{ selectedParticipants.length + 1 }}</span>
          </div>
        </div>
        <div class="countdown-section">
          <div class="countdown-circle">
            <span class="countdown-number">{{ redirectCountdown }}</span>
          </div>
          <p class="countdown-text">Redirecting in {{ redirectCountdown }} seconds</p>
        </div>
        <div class="end-call-actions">
          <button @click="redirectNow" class="btn btn-primary">
            <i class="fas fa-arrow-left"></i>
            Go Back Now
          </button>
          <button @click="stayOnPage" class="btn btn-secondary">
            <i class="fas fa-times"></i>
            Stay Here
          </button>
        </div>
      </div>
    </div>

    <!-- Permission Modal -->
    <div v-if="showPermissionModal" class="permission-modal-overlay">
      <div class="permission-modal">
        <div class="permission-modal-content">
          <div class="permission-icon">
            <i class="fas fa-video text-primary" style="font-size: 3rem;"></i>
          </div>

          <h3 class="text-center mb-3">Camera & Microphone Access Required</h3>

          <div class="permission-status mb-3">
            <div class="permission-item">
              <i class="fas fa-video me-2"></i>
              <span>Camera: </span>
              <span :class="{'text-success': permissionStatus.camera === 'granted', 'text-danger': permissionStatus.camera === 'denied', 'text-warning': permissionStatus.camera === 'prompt'}">
                {{ permissionStatus.camera === 'granted' ? 'Allowed' : permissionStatus.camera === 'denied' ? 'Denied' : 'Not requested' }}
              </span>
            </div>
            <div class="permission-item">
              <i class="fas fa-microphone me-2"></i>
              <span>Microphone: </span>
              <span :class="{'text-success': permissionStatus.microphone === 'granted', 'text-danger': permissionStatus.microphone === 'denied', 'text-warning': permissionStatus.microphone === 'prompt'}">
                {{ permissionStatus.microphone === 'granted' ? 'Allowed' : permissionStatus.microphone === 'denied' ? 'Denied' : 'Not requested' }}
              </span>
            </div>
          </div>

          <div v-if="permissionError" class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            {{ permissionError }}
          </div>

          <div class="text-center">
            <p class="mb-3">Video calls require access to your camera and microphone. Please allow access when prompted.</p>

            <div class="permission-actions">
              <button
                @click="requestPermissions"
                :disabled="permissionRequesting"
                class="btn btn-primary me-2"
              >
                <i v-if="permissionRequesting" class="fas fa-spinner fa-spin me-2"></i>
                <i v-else class="fas fa-video me-2"></i>
                {{ permissionRequesting ? 'Requesting...' : 'Allow Access' }}
              </button>

              <button
                @click="retryWithoutPermissions"
                class="btn btn-outline-secondary me-2"
                title="Join with audio only (no video)"
              >
                <i class="fas fa-microphone me-2"></i>
                Audio Only
              </button>

              <button
                @click="dismissPermissionModal"
                class="btn btn-outline-danger"
              >
                <i class="fas fa-times me-2"></i>
                Cancel
              </button>
            </div>

            <div class="mt-3">
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                You can also manually enable permissions in your browser settings
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { webRTCService, videoCallService } from '../services/webrtc'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

export default {
  name: 'VideoCall',
  props: {
    callId: String,
    isIncoming: Boolean
  },
  setup(props) {
    const authStore = useAuthStore()
    const router = useRouter()

    // Reactive state
    const localVideo = ref(null)
    const remoteVideo = ref(null)
    const videoContainer = ref(null)
    const preCallVideo = ref(null)

    const callStatus = ref('connecting')
    const callDuration = ref(0)
    const connectionQuality = ref('good')
    const remoteParticipant = ref(null)

    // Media states
    const isAudioMuted = ref(false)
    const isVideoMuted = ref(false)
    const isScreenSharing = ref(false)
    const isRecording = ref(false)

    // Permission states
    const permissionStatus = ref({ camera: 'unknown', microphone: 'unknown' })
    const showPermissionModal = ref(false)
    const permissionError = ref(null)
    const permissionRequesting = ref(false)
    const recordingDuration = ref(0)
    const recordingTimer = ref(null)
    const showRecordingOptions = ref(false)
    const showScreenShareOptions = ref(false)
    const recordingQuality = ref('1080p')
    const screenShareType = ref('screen')
    const recordingOptions = reactive({
      includeMicrophone: true,
      includeSystemAudio: false,
      saveLocation: 'local'
    })
    const screenShareOptions = reactive({
      includeAudio: false,
      quality: '1080p'
    })
    const isRemoteAudioMuted = ref(false)
    const isRemoteVideoMuted = ref(false)
    const isRemoteScreenSharing = ref(false)
    const isRemoteRecording = ref(false)

    // UI states
    const isFullScreen = ref(false)
    const showSettings = ref(false)
    const showRemoteVideo = ref(false)
    const isDragging = ref(false)
    const connectionIssue = ref('')

    // Device management
    const availableCameras = ref([])
    const availableMicrophones = ref([])
    const selectedCamera = ref('')
    const selectedMicrophone = ref('')
    const videoQuality = ref('hd')
    const backgroundEffect = ref('none')

    // Call management
    const incomingCall = ref(null)
    const canRecord = ref(true)
    const callTimer = ref(null)

    // Pre-call modal state
    const showPreCallModal = ref(true)
    const preCallVideoMuted = ref(false)
    const preCallAudioMuted = ref(false)
    const preCallCamera = ref('')
    const preCallMicrophone = ref('')
    const preCallStream = ref(null)

    // Participant management
    const selectedParticipants = ref([])
    const participantSearchQuery = ref('')
    const searchSuggestions = ref([])
    const callType = ref('video')

    // End call overlay state
    const showEndCallOverlay = ref(false)
    const callEndReason = ref('')
    const redirectCountdown = ref(5)
    const redirectTimer = ref(null)

    // Mock participant data (will come from API)
    const mockParticipants = ref([
      {
        id: 1,
        name: 'John Smith',
        email: 'john.smith@company.com',
        role: 'Project Manager',
        status: 'online',
        isOnline: true,
        avatar: null,
        color: '#4f46e5',
        category: 'colleagues'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        role: 'Developer',
        status: 'busy',
        isOnline: true,
        avatar: null,
        color: '#059669',
        category: 'colleagues'
      },
      {
        id: 3,
        name: 'Mike Chen',
        email: 'mike.chen@company.com',
        role: 'Designer',
        status: 'away',
        isOnline: false,
        avatar: null,
        color: '#dc2626',
        category: 'colleagues'
      },
      {
        id: 4,
        name: 'Development Team',
        email: 'dev-team@company.com',
        role: 'Team',
        status: 'active',
        isOnline: true,
        avatar: null,
        color: '#7c3aed',
        category: 'teams'
      },
      {
        id: 5,
        name: 'Marketing Team',
        email: 'marketing@company.com',
        role: 'Team',
        status: 'active',
        isOnline: true,
        avatar: null,
        color: '#ea580c',
        category: 'teams'
      }
    ])

    // Drag and drop for local video
    const dragState = reactive({
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0
    })

    // Initialize call
    const initializeCall = async () => {
      try {
        callStatus.value = 'connecting'

        // Check browser support
        if (!webRTCService.constructor.isSupported()) {
          throw new Error('WebRTC is not supported in this browser')
        }

        // Check permissions first
        const permissions = await webRTCService.checkPermissions()
        permissionStatus.value = permissions

        if (permissions.camera === 'denied' || permissions.microphone === 'denied') {
          showPermissionModal.value = true
          callStatus.value = 'permission-required'
          return
        }

        await webRTCService.initialize(authStore.user.id, authStore.user.organization_id)

        // Set up event listeners including permission events
        setupWebRTCEvents()

        // Get user media
        await webRTCService.getUserMedia()

        // Set local video stream
        if (localVideo.value && webRTCService.localStream) {
          localVideo.value.srcObject = webRTCService.localStream
        }

        // Join room if call ID provided
        if (props.callId) {
          await webRTCService.joinRoom(props.callId, props.callId)
        }

        // Get available devices
        await getAvailableDevices()

        callStatus.value = 'connected'
        startCallTimer()

      } catch (error) {
        console.error('Failed to initialize call:', error)

        // Handle permission-specific errors
        if (error.name === 'NotAllowedError') {
          permissionError.value = webRTCService.getPermissionErrorMessage(error)
          showPermissionModal.value = true
          callStatus.value = 'permission-required'
        } else if (error.name === 'NotFoundError') {
          permissionError.value = webRTCService.getPermissionErrorMessage(error)
          showPermissionModal.value = true
          callStatus.value = 'permission-required'
        } else if (error.name === 'NotReadableError') {
          permissionError.value = webRTCService.getPermissionErrorMessage(error)
          showPermissionModal.value = true
          callStatus.value = 'permission-required'
        } else {
          callStatus.value = 'failed'
          connectionIssue.value = 'Failed to connect'
        }
      }
    }

    // Setup WebRTC event listeners
    const setupWebRTCEvents = () => {
      webRTCService.on('remote-stream', (stream) => {
        if (remoteVideo.value) {
          remoteVideo.value.srcObject = stream
          showRemoteVideo.value = true
        }
      })

      webRTCService.on('user-joined', (data) => {
        console.log('User joined:', data)
        remoteParticipant.value = data
      })

      webRTCService.on('user-left', (data) => {
        console.log('User left:', data)
        showRemoteVideo.value = false
      })

      webRTCService.on('connection-state-change', (state) => {
        if (state === 'connected') {
          callStatus.value = 'connected'
          connectionIssue.value = ''
        } else if (state === 'disconnected' || state === 'failed') {
          callStatus.value = 'disconnected'
          connectionIssue.value = 'Connection lost'
        }
      })

      webRTCService.on('remote-audio-toggle', (data) => {
        isRemoteAudioMuted.value = data.muted
      })

      webRTCService.on('remote-video-toggle', (data) => {
        isRemoteVideoMuted.value = data.muted
      })

      webRTCService.on('remote-screen-share', (data) => {
        isRemoteScreenSharing.value = data.started
      })

      webRTCService.on('remote-recording-started', () => {
        isRemoteRecording.value = true
      })

      webRTCService.on('remote-recording-stopped', () => {
        isRemoteRecording.value = false
      })

      webRTCService.on('call-ended', () => {
        endCall()
      })

      // Permission-related event listeners
      webRTCService.on('permission-denied', (data) => {
        console.warn('Permission denied:', data)
        permissionError.value = 'Camera and microphone access was denied'
        showPermissionModal.value = true
        callStatus.value = 'permission-required'
      })

      webRTCService.on('device-not-found', (data) => {
        console.warn('Device not found:', data)
        permissionError.value = 'No camera or microphone found'
        showPermissionModal.value = true
        callStatus.value = 'permission-required'
      })

      webRTCService.on('device-not-readable', (data) => {
        console.warn('Device not readable:', data)
        permissionError.value = 'Camera or microphone is already in use'
        showPermissionModal.value = true
        callStatus.value = 'permission-required'
      })

      webRTCService.on('constraints-error', (data) => {
        console.warn('Constraints error:', data)
        permissionError.value = 'Camera or microphone does not support the requested settings'
        showPermissionModal.value = true
        callStatus.value = 'permission-required'
      })
    }

    // Media controls
    const toggleAudio = async () => {
      const enabled = webRTCService.toggleAudio()
      isAudioMuted.value = !enabled
    }

    const toggleVideo = async () => {
      const enabled = webRTCService.toggleVideo()
      isVideoMuted.value = !enabled
    }

    const toggleScreenShare = async () => {
      try {
        if (isScreenSharing.value) {
          await webRTCService.stopScreenShare()
          isScreenSharing.value = false
        } else {
          await webRTCService.startScreenShare()
          isScreenSharing.value = true
        }
      } catch (error) {
        console.error('Screen share error:', error)
      }
    }

    const startScreenShareWithOptions = async () => {
      try {
        const constraints = {
          video: {
            mediaSource: screenShareType.value,
            width: { max: getQualityConstraints(screenShareOptions.quality).width },
            height: { max: getQualityConstraints(screenShareOptions.quality).height },
            frameRate: { max: 30 }
          },
          audio: screenShareOptions.includeAudio
        }

        await webRTCService.startScreenShare(constraints)
        isScreenSharing.value = true
        showScreenShareOptions.value = false
      } catch (error) {
        console.error('Screen share error:', error)
      }
    }

    const getQualityConstraints = (quality) => {
      const constraints = {
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '1440p': { width: 2560, height: 1440 },
        '2160p': { width: 3840, height: 2160 }
      }
      return constraints[quality] || constraints['1080p']
    }

    const toggleRecording = async () => {
      try {
        if (isRecording.value) {
          webRTCService.stopRecording()
          if (props.callId) {
            await videoCallService.stopRecording(props.callId)
          }
          isRecording.value = false
          stopRecordingTimer()
        } else {
          await webRTCService.startRecording()
          if (props.callId) {
            await videoCallService.startRecording(props.callId)
          }
          isRecording.value = true
          startRecordingTimer()
        }
      } catch (error) {
        console.error('Recording error:', error)
      }
    }

    const startRecordingWithOptions = async () => {
      try {
        // Configure recording options
        const options = {
          quality: recordingQuality.value,
          includeMicrophone: recordingOptions.includeMicrophone,
          includeSystemAudio: recordingOptions.includeSystemAudio,
          saveLocation: recordingOptions.saveLocation
        }

        await webRTCService.startRecording(options)
        if (props.callId) {
          await videoCallService.startRecording(props.callId, options)
        }
        isRecording.value = true
        showRecordingOptions.value = false
        startRecordingTimer()
      } catch (error) {
        console.error('Recording error:', error)
      }
    }

    const startRecordingTimer = () => {
      recordingDuration.value = 0
      recordingTimer.value = setInterval(() => {
        recordingDuration.value++
      }, 1000)
    }

    const stopRecordingTimer = () => {
      if (recordingTimer.value) {
        clearInterval(recordingTimer.value)
        recordingTimer.value = null
      }
      recordingDuration.value = 0
    }

    const formatRecordingDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60

      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    // Get available devices
    const getAvailableDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()

        availableCameras.value = devices.filter(device => device.kind === 'videoinput')
        availableMicrophones.value = devices.filter(device => device.kind === 'audioinput')

        // Set default selections
        if (availableCameras.value.length > 0) {
          selectedCamera.value = availableCameras.value[0].deviceId
        }
        if (availableMicrophones.value.length > 0) {
          selectedMicrophone.value = availableMicrophones.value[0].deviceId
        }
      } catch (error) {
        console.error('Failed to get devices:', error)
      }
    }

    // Switch camera
    const switchCamera = async () => {
      try {
        const constraints = {
          video: { deviceId: { exact: selectedCamera.value } },
          audio: { deviceId: { exact: selectedMicrophone.value } }
        }
        await webRTCService.getUserMedia(constraints)

        if (localVideo.value) {
          localVideo.value.srcObject = webRTCService.localStream
        }
      } catch (error) {
        console.error('Failed to switch camera:', error)
      }
    }

    // Switch microphone
    const switchMicrophone = async () => {
      await switchCamera() // Same logic applies
    }

    // Update video quality
    const updateVideoQuality = async () => {
      // This would typically involve renegotiating the peer connection
      // For now, just store the preference
      console.log('Video quality changed to:', videoQuality.value)
    }

    // Set background effect
    const setBackgroundEffect = (effect) => {
      backgroundEffect.value = effect
      // TODO: Implement background blur/replacement
      console.log('Background effect:', effect)
    }

    // Full screen
    const toggleFullScreen = () => {
      if (!isFullScreen.value) {
        if (videoContainer.value.requestFullscreen) {
          videoContainer.value.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
      }
      isFullScreen.value = !isFullScreen.value
    }

    // Handle incoming calls
    const acceptCall = async () => {
      if (!incomingCall.value) return

      try {
        await videoCallService.acceptCall(incomingCall.value.call_id)
        await initializeCall()
        incomingCall.value = null
      } catch (error) {
        console.error('Failed to accept call:', error)
      }
    }

    const rejectCall = async () => {
      if (!incomingCall.value) return

      try {
        await videoCallService.rejectCall(incomingCall.value.call_id)
        incomingCall.value = null
        // Close the call window or redirect
        this.$router.go(-1)
      } catch (error) {
        console.error('Failed to reject call:', error)
      }
    }

    // End call with overlay and countdown
    const endCall = async (reason = 'Call ended') => {
      try {
        if (props.callId) {
          await videoCallService.endCall(props.callId)
        }

        webRTCService.cleanup()
        stopCallTimer()

        // Show end call overlay
        callEndReason.value = reason
        showEndCallOverlay.value = true

        // Start countdown
        startRedirectCountdown()
      } catch (error) {
        console.error('Failed to end call:', error)
        // Still show overlay even if API call fails
        callEndReason.value = 'Call ended with error'
        showEndCallOverlay.value = true
        startRedirectCountdown()
      }
    }

    // Call timer
    const startCallTimer = () => {
      callTimer.value = setInterval(() => {
        callDuration.value++
      }, 1000)
    }

    const stopCallTimer = () => {
      if (callTimer.value) {
        clearInterval(callTimer.value)
        callTimer.value = null
      }
    }

    // Format duration
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    // End call overlay functions
    const startRedirectCountdown = () => {
      redirectCountdown.value = 5
      redirectTimer.value = setInterval(() => {
        redirectCountdown.value--
        if (redirectCountdown.value <= 0) {
          clearInterval(redirectTimer.value)
          redirectNow()
        }
      }, 1000)
    }

    const redirectNow = (event) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      if (redirectTimer.value) {
        clearInterval(redirectTimer.value)
        redirectTimer.value = null
      }
      showEndCallOverlay.value = false
      router.go(-1)
    }

    const stayOnPage = (event) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      if (redirectTimer.value) {
        clearInterval(redirectTimer.value)
        redirectTimer.value = null
      }
      showEndCallOverlay.value = false
    }

    // Drag functionality for local video
    const startDrag = (event) => {
      isDragging.value = true
      const clientX = event.clientX || event.touches[0].clientX
      const clientY = event.clientY || event.touches[0].clientY

      dragState.startX = clientX
      dragState.startY = clientY

      const rect = event.target.closest('.local-video-container').getBoundingClientRect()
      dragState.startLeft = rect.left
      dragState.startTop = rect.top

      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', stopDrag)
      document.addEventListener('touchmove', handleDrag)
      document.addEventListener('touchend', stopDrag)
    }

    const handleDrag = (event) => {
      if (!isDragging.value) return

      const clientX = event.clientX || event.touches[0].clientX
      const clientY = event.clientY || event.touches[0].clientY

      const deltaX = clientX - dragState.startX
      const deltaY = clientY - dragState.startY

      const element = document.querySelector('.local-video-container')
      if (element) {
        element.style.left = `${dragState.startLeft + deltaX}px`
        element.style.top = `${dragState.startTop + deltaY}px`
      }
    }

    const stopDrag = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('touchmove', handleDrag)
      document.removeEventListener('touchend', stopDrag)
    }

    // Pre-call modal methods
    const initializePreCall = async () => {
      try {
        // Get available devices first
        await getAvailableDevices()

        // Set default devices
        if (availableCameras.value.length > 0) {
          preCallCamera.value = availableCameras.value[0].deviceId
        }
        if (availableMicrophones.value.length > 0) {
          preCallMicrophone.value = availableMicrophones.value[0].deviceId
        }

        // Get user media for preview
        await getPreCallUserMedia()
      } catch (error) {
        console.error('Failed to initialize pre-call:', error)
      }
    }

    const getPreCallUserMedia = async () => {
      try {
        // Stop existing stream first
        if (preCallStream.value) {
          preCallStream.value.getTracks().forEach(track => track.stop())
        }

        let constraints = {
          video: preCallCamera.value ? { deviceId: { exact: preCallCamera.value } } : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: preCallMicrophone.value ? { deviceId: { exact: preCallMicrophone.value } } : {
            echoCancellation: true,
            noiseSuppression: true
          }
        }

        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (exactError) {
          console.warn('Exact device constraints failed, trying fallback:', exactError)
          // Fallback to basic constraints
          constraints = {
            video: true,
            audio: true
          }
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        }

        preCallStream.value = stream

        if (preCallVideo.value) {
          preCallVideo.value.srcObject = stream
        }

        // Set initial muted states
        stream.getAudioTracks().forEach(track => {
          track.enabled = !preCallAudioMuted.value
        })
        stream.getVideoTracks().forEach(track => {
          track.enabled = !preCallVideoMuted.value
        })
      } catch (error) {
        console.error('Failed to get pre-call media:', error)

        // Show user-friendly error message
        if (error.name === 'NotAllowedError') {
          alert('Camera and microphone access is required for video calls. Please allow access and try again.')
        } else if (error.name === 'NotFoundError') {
          alert('No camera or microphone found. Please connect a camera/microphone and try again.')
        } else if (error.name === 'NotReadableError') {
          alert('Camera is already being used by another application. Please close other applications using the camera and try again.')
        } else {
          alert('Unable to access camera and microphone. Please check your device settings and try again.')
        }
      }
    }

    const updatePreCallCamera = async () => {
      await getPreCallUserMedia()
    }

    const updatePreCallMicrophone = async () => {
      await getPreCallUserMedia()
    }

    const togglePreCallVideo = () => {
      preCallVideoMuted.value = !preCallVideoMuted.value
      if (preCallStream.value) {
        preCallStream.value.getVideoTracks().forEach(track => {
          track.enabled = !preCallVideoMuted.value
        })
      }
    }

    const togglePreCallAudio = () => {
      preCallAudioMuted.value = !preCallAudioMuted.value
      if (preCallStream.value) {
        preCallStream.value.getAudioTracks().forEach(track => {
          track.enabled = !preCallAudioMuted.value
        })
      }
    }

    const startCall = async () => {
      try {
        // Stop the pre-call stream
        if (preCallStream.value) {
          preCallStream.value.getTracks().forEach(track => track.stop())
        }

        // Hide the pre-call modal
        showPreCallModal.value = false

        // Apply the selected settings
        selectedCamera.value = preCallCamera.value
        selectedMicrophone.value = preCallMicrophone.value
        isAudioMuted.value = preCallAudioMuted.value
        isVideoMuted.value = preCallVideoMuted.value

        // Initialize the actual call
        await initializeCall()
      } catch (error) {
        console.error('Failed to start call:', error)
      }
    }

    const cancelCall = () => {
      // Stop the pre-call stream
      if (preCallStream.value) {
        preCallStream.value.getTracks().forEach(track => track.stop())
      }

      // Navigate back
      window.history.back()
    }

    // Permission management functions
    const requestPermissions = async () => {
      permissionRequesting.value = true
      permissionError.value = null

      try {
        const result = await webRTCService.requestPermissions()
        permissionStatus.value = result.permissions

        if (result.success) {
          showPermissionModal.value = false
          // Retry initializing the call
          await initializeCall()
        } else {
          permissionError.value = result.message
        }
      } catch (error) {
        console.error('Permission request failed:', error)
        permissionError.value = 'Failed to request permissions'
      } finally {
        permissionRequesting.value = false
      }
    }

    const retryWithoutPermissions = async () => {
      showPermissionModal.value = false
      permissionError.value = null

      try {
        // Try to proceed without media (audio-only or no media)
        const constraints = {
          video: false,
          audio: permissionStatus.value.microphone !== 'denied'
        }

        await webRTCService.initialize(authStore.user.id, authStore.user.organization_id)
        setupWebRTCEvents()

        if (constraints.audio) {
          await webRTCService.getUserMedia(constraints)
          if (localVideo.value && webRTCService.localStream) {
            localVideo.value.srcObject = webRTCService.localStream
          }
        }

        if (props.callId) {
          await webRTCService.joinRoom(props.callId, props.callId)
        }

        await getAvailableDevices()
        callStatus.value = 'connected'
        startCallTimer()
      } catch (error) {
        console.error('Failed to initialize without permissions:', error)
        callStatus.value = 'failed'
        connectionIssue.value = 'Failed to connect'
      }
    }

    const dismissPermissionModal = () => {
      showPermissionModal.value = false
      permissionError.value = null
      // Go back to previous page
      router.go(-1)
    }

    // Participant management methods
    const searchParticipants = () => {
      if (!participantSearchQuery.value.trim()) {
        searchSuggestions.value = []
        return
      }

      const query = participantSearchQuery.value.toLowerCase()
      const filtered = mockParticipants.value.filter(participant =>
        participant.name.toLowerCase().includes(query) ||
        participant.email.toLowerCase().includes(query) ||
        participant.role.toLowerCase().includes(query)
      )

      searchSuggestions.value = filtered
    }

    const addParticipant = (participant) => {
      if (!isParticipantSelected(participant)) {
        selectedParticipants.value.push(participant)
      }
      participantSearchQuery.value = ''
      searchSuggestions.value = []
    }

    const removeParticipant = (participant) => {
      const index = selectedParticipants.value.findIndex(p => p.id === participant.id)
      if (index > -1) {
        selectedParticipants.value.splice(index, 1)
      }
    }

    const isParticipantSelected = (participant) => {
      return selectedParticipants.value.some(p => p.id === participant.id)
    }

    const getInitials = (name) => {
      return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    }

    // Computed property for grouped suggestions
    const groupedSuggestions = computed(() => {
      const groups = {
        colleagues: {
          type: 'colleagues',
          title: 'Colleagues',
          icon: 'fas fa-user',
          items: []
        },
        teams: {
          type: 'teams',
          title: 'Teams',
          icon: 'fas fa-users',
          items: []
        }
      }

      searchSuggestions.value.forEach(participant => {
        if (groups[participant.category]) {
          groups[participant.category].items.push(participant)
        }
      })

      return Object.values(groups).filter(group => group.items.length > 0)
    })

    // Lifecycle
    onMounted(async () => {
      if (props.isIncoming && props.callId) {
        // This is an incoming call, show the modal
        // In a real app, you'd get call details from the backend
        showPreCallModal.value = false
        incomingCall.value = {
          call_id: props.callId,
          caller: { name: 'Unknown Caller' },
          call_type: 'video'
        }
      } else {
        // Initialize the pre-call modal
        await initializePreCall()
      }
    })

    onUnmounted(() => {
      webRTCService.cleanup()
      stopCallTimer()

      // Cleanup pre-call stream
      if (preCallStream.value) {
        preCallStream.value.getTracks().forEach(track => track.stop())
      }
    })

    return {
      // Refs
      localVideo,
      remoteVideo,
      videoContainer,
      preCallVideo,

      // State
      callStatus,
      callDuration,
      connectionQuality,
      remoteParticipant,
      isAudioMuted,
      isVideoMuted,
      isScreenSharing,
      isRecording,
      recordingDuration,
      showRecordingOptions,
      showScreenShareOptions,
      recordingQuality,
      screenShareType,
      recordingOptions,
      screenShareOptions,
      isRemoteAudioMuted,
      isRemoteVideoMuted,
      isRemoteScreenSharing,
      isRemoteRecording,
      isFullScreen,
      showSettings,
      showRemoteVideo,
      isDragging,
      connectionIssue,
      availableCameras,
      availableMicrophones,
      selectedCamera,
      selectedMicrophone,
      videoQuality,
      backgroundEffect,
      incomingCall,
      canRecord,

      // Permission-related state
      permissionStatus,
      showPermissionModal,
      permissionError,
      permissionRequesting,

      // Pre-call modal state
      showPreCallModal,
      preCallVideoMuted,
      preCallAudioMuted,
      preCallCamera,
      preCallMicrophone,

      // Participant management
      selectedParticipants,
      participantSearchQuery,
      searchSuggestions,
      callType,
      groupedSuggestions,

      // End call overlay state
      showEndCallOverlay,
      callEndReason,
      redirectCountdown,

      // Methods
      toggleAudio,
      toggleVideo,
      toggleScreenShare,
      toggleRecording,
      startRecordingWithOptions,
      startScreenShareWithOptions,
      formatRecordingDuration,
      switchCamera,
      switchMicrophone,
      updateVideoQuality,
      setBackgroundEffect,
      toggleFullScreen,
      acceptCall,
      rejectCall,
      endCall,
      formatDuration,
      redirectNow,
      stayOnPage,
      startDrag,

      // Pre-call modal methods
      togglePreCallVideo,
      togglePreCallAudio,
      updatePreCallCamera,
      updatePreCallMicrophone,
      startCall,
      cancelCall,

      // Permission management functions
      requestPermissions,
      retryWithoutPermissions,
      dismissPermissionModal,

      // Participant management methods
      searchParticipants,
      addParticipant,
      removeParticipant,
      isParticipantSelected,
      getInitials
    }
  }
}
</script>

<style scoped>
.video-call-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.video-call-container.full-screen {
  z-index: 9999;
}

/* Call Header */
.call-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
  padding: var(--spacing-lg);
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participant-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.participant-avatar {
  width: 48px;
  height: 48px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.participant-avatar.large {
  width: 80px;
  height: 80px;
  font-size: 2rem;
}

.participant-details h3 {
  color: white;
  margin: 0;
  font-size: var(--font-size-lg);
}

.participant-details p {
  color: rgba(255,255,255,0.8);
  margin: 0;
  font-size: var(--font-size-sm);
}

.quality-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
}

.quality-indicator.excellent { background: #10b981; }
.quality-indicator.good { background: #f59e0b; }
.quality-indicator.fair { background: #ef4444; }
.quality-indicator.poor { background: #6b7280; }

/* Video Streams */
.video-streams {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remote-video-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

.remote-video.screen-share {
  object-fit: contain;
}

.local-video-container {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.3);
  cursor: move;
  z-index: 10;
  transition: var(--transition-smooth);
}

.local-video-container.dragging {
  transform: scale(1.05);
  box-shadow: var(--shadow-strong);
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

.remote-video-overlay,
.local-video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
}

.mute-indicators {
  display: flex;
  gap: var(--spacing-sm);
}

.mute-indicators i {
  color: #ef4444;
  font-size: 1.5rem;
}

.remote-participant-name,
.local-participant-name {
  position: absolute;
  bottom: var(--spacing-sm);
  left: var(--spacing-sm);
  color: white;
  font-size: var(--font-size-xs);
  background: rgba(0,0,0,0.5);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-xs);
}

.no-video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}

.placeholder-content {
  text-align: center;
  color: white;
}

.placeholder-content h3 {
  margin: var(--spacing-md) 0 var(--spacing-sm) 0;
  color: white;
}

.placeholder-content p {
  color: rgba(255,255,255,0.6);
  margin: 0;
}

/* Call Controls */
.call-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: var(--spacing-xl);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-lg);
}

.control-buttons {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  background: rgba(255,255,255,0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  transform: scale(1.1);
  background: rgba(255,255,255,0.3);
}

.control-btn.muted,
.control-btn.active {
  background: var(--primary-color);
}

.control-btn.recording {
  background: #ef4444;
  animation: pulse-record 1s infinite;
}

.end-call-btn {
  background: #ef4444;
  width: 64px;
  height: 64px;
}

.end-call-btn:hover {
  background: #dc2626;
}

@keyframes pulse-record {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.call-timer {
  color: white;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  background: rgba(0,0,0,0.5);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
}

/* Settings Panel */
.settings-panel {
  position: absolute;
  bottom: 120px;
  right: 20px;
  width: 300px;
  background: rgba(0,0,0,0.9);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
}

.settings-content h3 {
  color: white;
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--font-size-lg);
}

.setting-group {
  margin-bottom: var(--spacing-md);
}

.setting-group label {
  display: block;
  color: rgba(255,255,255,0.8);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
}

.setting-group select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--border-radius-sm);
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: var(--font-size-sm);
}

.background-options {
  display: flex;
  gap: var(--spacing-sm);
}

.bg-option {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--border-radius-sm);
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.bg-option.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

/* Pre-Call Modal */
.pre-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.pre-call-content {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  margin-bottom: var(--spacing-xl);
}

.modal-header h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.modal-header p {
  margin: 0;
  color: var(--text-medium);
  font-size: 1rem;
}

.pre-call-video-preview {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
  background: #1a1a1a;
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.7);
}

.preview-placeholder {
  text-align: center;
  color: white;
}

.preview-placeholder i {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
  opacity: 0.6;
}

.preview-placeholder p {
  margin: 0;
  font-size: 1rem;
  opacity: 0.8;
}

.pre-call-settings {
  margin-bottom: var(--spacing-xl);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.setting-row label {
  min-width: 100px;
  text-align: left;
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.setting-row select {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--input-background);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.media-controls {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-lg);
}

.media-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--button-secondary-background);
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition-smooth);
  font-size: var(--font-size-sm);
}

.media-btn:hover {
  background: var(--button-secondary-hover);
}

.media-btn.muted {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.media-btn.muted:hover {
  background: #dc2626;
}

.pre-call-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.cancel-btn,
.start-call-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.cancel-btn {
  background: var(--button-secondary-background);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover {
  background: var(--button-secondary-hover);
}

.start-call-btn {
  background: #10b981;
  color: white;
}

.start-call-btn:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

/* Participant Search Styles */
.participants-section {
  margin-bottom: var(--spacing-xl);
  text-align: left;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.section-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.participant-count {
  background: var(--primary-color);
  color: white;
  padding: 4px 12px;
  border-radius: var(--border-radius-full);
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
}

.search-input-wrapper {
  position: relative;
  margin-bottom: var(--spacing-md);
}

.participant-search-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) 3rem;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  background: var(--input-background);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.participant-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  font-size: 1rem;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-large);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.suggestion-category {
  border-bottom: 1px solid var(--border-color);
}

.suggestion-category:last-child {
  border-bottom: none;
}

.category-header {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--surface-secondary);
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  color: var(--text-medium);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--border-light);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: var(--surface-secondary);
}

.suggestion-item.selected {
  background: rgba(79, 70, 229, 0.1);
  border-left: 3px solid var(--primary-color);
}

.participant-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  margin-right: var(--spacing-md);
}

.participant-avatar img,
.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  color: white;
  font-size: 0.9rem;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #10b981;
  border: 2px solid var(--card-background);
  border-radius: 50%;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-detail {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.85rem;
}

.role {
  color: var(--text-medium);
}

.status {
  padding: 2px 8px;
  border-radius: var(--border-radius-sm);
  font-size: 0.75rem;
  font-weight: var(--font-weight-medium);
}

.status.online {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status.busy {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status.away {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status.active {
  background: rgba(79, 70, 229, 0.1);
  color: var(--primary-color);
}

.participant-actions {
  color: var(--text-light);
  font-size: 1rem;
}

.suggestion-item:hover .participant-actions {
  color: var(--primary-color);
}

.selected-participants {
  margin-top: var(--spacing-md);
}

.participant-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.participant-chip {
  display: flex;
  align-items: center;
  background: var(--surface-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-full);
  padding: 6px 12px 6px 6px;
  gap: var(--spacing-sm);
  transition: all 0.2s ease;
}

.participant-chip:hover {
  background: var(--surface-tertiary);
  border-color: var(--primary-color);
}

.chip-avatar {
  width: 24px;
  height: 24px;
}

.chip-avatar img,
.chip-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  font-size: 0.7rem;
}

.chip-name {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.remove-chip {
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-chip:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.call-type-selection {
  margin: var(--spacing-lg) 0;
}

.call-type-options {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.call-type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--surface-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.85rem;
  color: var(--text-medium);
}

.call-type-btn:hover {
  border-color: var(--primary-color);
  background: rgba(79, 70, 229, 0.05);
}

.call-type-btn.active {
  border-color: var(--primary-color);
  background: rgba(79, 70, 229, 0.1);
  color: var(--primary-color);
}

.call-type-btn i {
  font-size: 1.2rem;
}

.pre-call-content {
  max-width: 600px;
  max-height: 95vh;
}

/* Incoming Call Modal */
.incoming-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  min-width: 300px;
}

.caller-info {
  margin-bottom: var(--spacing-xl);
}

.caller-avatar {
  width: 80px;
  height: 80px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  margin: 0 auto var(--spacing-md) auto;
}

.caller-info h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.caller-info p {
  margin: 0;
  color: var(--text-medium);
}

.call-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.accept-btn,
.reject-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.accept-btn {
  background: #10b981;
  color: white;
}

.accept-btn:hover {
  background: #059669;
}

.reject-btn {
  background: #ef4444;
  color: white;
}

.reject-btn:hover {
  background: #dc2626;
}

/* Recording Indicator */
.recording-indicator {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.recording-duration {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  margin-left: 8px;
}

.screen-share-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  z-index: 100;
  animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
  0%, 100% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.6); }
}

.rec-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Connection Status */
.connection-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-md);
  z-index: 100;
}

/* Control Groups */
.control-group {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.control-btn-small {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.control-btn-small:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* Recording Options Modal */
.recording-options-modal,
.screen-share-options-modal {
  width: 90%;
  max-width: 500px;
}

.option-group {
  margin-bottom: 1.5rem;
}

.option-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
}

.form-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal !important;
  margin-bottom: 0 !important;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.share-type-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.share-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.share-type-btn:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.share-type-btn.active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
}

.share-type-btn i {
  font-size: 1.5rem;
  color: inherit;
}

/* Modal Enhancements */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: var(--bg-secondary);
}

.modal-footer .btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-footer .btn-secondary {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.modal-footer .btn-secondary:hover {
  background: var(--bg-tertiary);
}

.modal-footer .btn-primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: white;
}

.modal-footer .btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Responsive Design */
@media (max-width: 768px) {
  .local-video-container {
    width: 120px;
    height: 90px;
    top: 10px;
    right: 10px;
  }

  .call-controls {
    padding: var(--spacing-lg);
  }

  .control-btn {
    width: 48px;
    height: 48px;
    font-size: 1rem;
  }

  .end-call-btn {
    width: 56px;
    height: 56px;
  }

  .settings-panel {
    bottom: 100px;
    right: 10px;
    left: 10px;
    width: auto;
  }

  .call-header {
    padding: var(--spacing-md);
  }

  .participant-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
}

/* End Call Overlay */
.end-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
}

.end-call-content {
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

.end-call-icon {
  width: 80px;
  height: 80px;
  background: var(--danger-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-lg);
  font-size: 2rem;
  color: white;
}

.end-call-content h2 {
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  font-size: 1.5rem;
}

.end-call-content p {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.call-summary {
  background: var(--bg-light);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin: var(--spacing-lg) 0;
  border: 1px solid var(--border-color);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.summary-value {
  color: var(--text-primary);
  font-weight: 600;
}

.countdown-section {
  margin: var(--spacing-lg) 0;
}

.countdown-circle {
  width: 80px;
  height: 80px;
  border: 4px solid var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
  position: relative;
  background: var(--primary-light);
}

.countdown-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.countdown-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.end-call-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-lg);
}

.end-call-actions .btn {
  min-width: 120px;
  font-weight: 500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Solo recording styling */
.optional-text {
  color: var(--text-secondary);
  font-weight: normal;
  font-size: 0.9rem;
}

.participant-count span {
  color: var(--text-secondary);
  font-style: italic;
}

/* Permission Modal Styles */
.permission-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.permission-modal {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: permissionModalSlideIn 0.3s ease-out;
}

.permission-modal-content {
  text-align: center;
}

.permission-icon {
  margin-bottom: 1.5rem;
  animation: permissionIconPulse 2s infinite;
}

.permission-status {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.permission-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.permission-item:last-child {
  margin-bottom: 0;
}

.permission-item i {
  width: 20px;
  text-align: center;
}

.permission-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.permission-actions .btn {
  min-width: 120px;
}

@keyframes permissionModalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes permissionIconPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

/* Responsive permission modal */
@media (max-width: 576px) {
  .permission-modal {
    padding: 1.5rem;
    margin: 1rem;
  }

  .permission-actions {
    flex-direction: column;
  }

  .permission-actions .btn {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}
</style>