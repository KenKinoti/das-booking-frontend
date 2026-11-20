<template>
  <!-- Shown when the API says this person may not use football analysis (role, business type or plan). -->
  <div class="ui-empty fb-noaccess" data-test="fb-no-access" role="status">
    <div class="ui-empty__icon"><i class="fa-solid fa-lock"></i></div>
    <h3>Football analysis isn't available to you</h3>
    <p>
      <template v-if="reason === 'plan'">It is not part of your organisation's plan.</template>
      <template v-else>Your role doesn't include football analysis. Owners and managers have it by default; an admin can add it to a role in Settings → Business type → Roles &amp; permissions.</template>
    </p>
    <router-link class="ui-btn" :to="home"><i class="fa-solid fa-house"></i> Go to my home page</router-link>
  </div>
</template>

<script>
import { homePath } from '@/composables/useAccess'

export default {
  name: 'FbNoAccess',
  props: { reason: { type: String, default: 'role' } },
  computed: {
    home() {
      return homePath()
    }
  }
}
</script>

<style scoped>
.fb-noaccess {
  max-width: 560px;
  margin: 40px auto;
}
</style>
