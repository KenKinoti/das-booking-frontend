<template>
  <div class="nf">
    <div class="ui-empty__icon"><i class="fa-solid fa-compass"></i></div>
    <h1>Page not found</h1>
    <p>The page you’re looking for doesn’t exist or has moved.</p>
    <div class="ui-actions center">
      <button class="ui-btn" @click="$router.back()"><i class="fa-solid fa-arrow-left"></i> Go back</button>
      <router-link to="/dashboard" class="ui-btn ui-btn--primary">Go to dashboard</router-link>
    </div>
  </div>
</template>

<script>
export default { name: 'NotFound' }
</script>

<style scoped>
.nf {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 16px;
  color: var(--text-3);
}
.nf h1 {
  font-size: 28px;
  margin: 0 0 6px;
}
.center {
  justify-content: center;
  margin-top: 18px;
}
</style>
