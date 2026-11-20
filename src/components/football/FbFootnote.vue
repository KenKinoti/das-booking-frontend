<template>
  <!-- Calm responsible-gambling note at the foot of every football page. -->
  <aside class="fb-footnote" data-test="fb-footnote" aria-label="About betting">
    <strong>18+ only.</strong>
    Probabilities here are estimates with their inputs shown, never certainties. DASYIN doesn't take bets or hold money — you bet with your own bookmaker and record it
    here. Set limits on <router-link to="/football/bets#limits">My bets</router-link> and in your bookmaker's app, and take a break when it stops being fun.
    <span class="fb-footnote__links">
      Someone to talk to:
      <a href="https://befrienderskenya.org" target="_blank" rel="noopener noreferrer">Befrienders Kenya</a> ·
      <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer">Gamblers Anonymous</a> ·
      <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware</a>
    </span>
  </aside>
</template>

<script>
export default { name: 'FbFootnote' }
</script>

<style scoped>
.fb-footnote__links {
  display: block;
  margin-top: 4px;
}
</style>
