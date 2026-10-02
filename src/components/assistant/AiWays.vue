<template>
  <!--
    "Two ways to use AI with DASYIN" — shown wherever the in-app assistant is
    off (panel, /assistant) and on the AI & MCP page. People regularly assume
    that connecting Claude over MCP also switches on Ask DASYIN; this spells
    out that they are separate and shows the status of each.
  -->
  <ol class="aw" :class="`aw--${variant}`" data-test="ai-ways">
    <li class="aw__way" :class="{ 'is-on': mcp.connected }" data-test="ai-way-claude">
      <span class="aw__num" aria-hidden="true">1</span>
      <div class="aw__body">
        <div class="aw__head">
          <strong>From Claude</strong>
          <span v-if="mcp.connected" class="ui-badge ui-badge--success" data-test="mcp-connected-badge">Connected</span>
          <span v-else class="ui-badge">Not connected</span>
        </div>
        <template v-if="mcp.connected">
          <p class="aw__ok" data-test="mcp-connected"><i class="fa-solid fa-circle-check"></i> Claude is connected to this workspace via MCP ✓</p>
          <p v-if="mcp.mine">You already connected Claude to DASYIN with MCP — chat with your data from the Claude app.</p>
          <p v-else>Someone in your workspace connected Claude to DASYIN with MCP. Connect your own Claude to chat with your data from the Claude app.</p>
        </template>
        <p v-else>Connect Claude to DASYIN with MCP, then chat with your data from the Claude app. No API key needed.</p>
        <router-link v-if="linkMcp && (!mcp.connected || !mcp.mine)" class="ui-btn ui-btn--sm" to="/settings/ai" data-test="connect-claude" @click="leave">
          <i class="fa-solid fa-plug"></i> Connect Claude (MCP)
        </router-link>
      </div>
    </li>

    <li class="aw__way" :class="{ 'is-on': enabled }" data-test="ai-way-inapp">
      <span class="aw__num" aria-hidden="true">2</span>
      <div class="aw__body">
        <div class="aw__head">
          <strong>Inside DASYIN <span class="aw__sub">(Ask DASYIN panel)</span></strong>
          <span v-if="enabled" class="ui-badge ui-badge--success" data-test="inapp-on-badge">On</span>
          <span v-else class="ui-badge ui-badge--warning" data-test="inapp-off-badge">Needs an API key</span>
        </div>
        <template v-if="enabled">
          <p>
            Ask DASYIN is switched on<template v-if="status && status.model"> (model {{ status.model }})</template>. Open it from the top bar or press <kbd>Ctrl</kbd>+<kbd>J</kbd>.
          </p>
        </template>
        <template v-else>
          <p>Needs an Anthropic API key. This is separate from the Claude connection above — connecting Claude with MCP does not switch it on.</p>
          <p v-if="problem" class="aw__problem"><i class="fa-solid fa-triangle-exclamation"></i> {{ problem }}</p>
          <router-link v-if="isSuperAdmin" class="ui-btn ui-btn--primary ui-btn--sm" :to="settingsPath" data-test="add-api-key" @click="leave">
            <i class="fa-solid fa-key"></i> Add API key
          </router-link>
          <p v-else class="aw__ask" data-test="ask-admin"><i class="fa-regular fa-user"></i> Ask your administrator to add one (System settings → AI assistant).</p>
        </template>
        <p class="aw__fine">API usage is billed separately from a Claude subscription.</p>
      </div>
    </li>
  </ol>
</template>

<script>
import { useAuthStore } from '@/stores/auth'
import { closeAssistant } from '@/composables/useAssistant'

export default {
  name: 'AiWays',
  props: {
    /** GET /assistant/status */
    status: { type: Object, default: null },
    /** panel = narrow slide-over, page = roomy two-column box */
    variant: { type: String, default: 'panel' },
    /** show the "Connect Claude (MCP)" link (off on the AI & MCP page itself) */
    linkMcp: { type: Boolean, default: true }
  },
  emits: ['navigate'],
  computed: {
    mcp() {
      return this.status?.mcp || { connected: false, mine: false }
    },
    enabled() {
      return !!this.status?.enabled
    },
    problem() {
      return this.status?.problem || ''
    },
    isSuperAdmin() {
      return !!this.status?.super_admin || useAuthStore().isSuperAdmin
    },
    settingsPath() {
      return this.status?.setup_path || '/system-settings?tab=ai'
    }
  },
  methods: {
    /** Going to a settings page: close the slide-over so it doesn't cover the form. */
    leave() {
      closeAssistant()
      this.$emit('navigate')
    }
  }
}
</script>

<style scoped>
.aw {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
  width: 100%;
  text-align: left;
}

.aw--page {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.aw__way {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  min-width: 0;
}

.aw__num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
}

.aw__way.is-on .aw__num {
  background: var(--success-soft);
  color: var(--success);
}

.aw__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
}

.aw__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  width: 100%;
}

.aw__head strong {
  font-size: 14px;
  font-weight: 650;
  color: var(--text);
}

.aw__sub {
  font-weight: 500;
  color: var(--text-2);
}

.aw__body p {
  margin: 0;
  max-width: none;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
  overflow-wrap: anywhere;
}

.aw__body p.aw__ok {
  font-weight: 600;
  color: var(--success);
}

.aw__body p.aw__problem {
  color: var(--danger);
}

.aw__body p.aw__ask {
  color: var(--text);
  font-weight: 550;
}

.aw__body p.aw__fine {
  font-size: 12px;
  color: var(--text-3);
}

.aw__body kbd {
  font-family: inherit;
  font-size: 11.5px;
  padding: 1px 5px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.aw .ui-btn {
  text-decoration: none;
}

@media (max-width: 820px) {
  .aw--page {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
