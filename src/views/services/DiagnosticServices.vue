<template>
  <div class="diagnostic-services">
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <div class="category-icon">
            <i class="fas fa-stethoscope"></i>
          </div>
          <div class="title-section">
            <h1>Diagnostic Services</h1>
            <p class="category-description">Advanced diagnostic and testing services for accurate assessments</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-primary">
            <i class="fas fa-plus"></i>
            Add Service
          </button>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="coming-soon">
        <div class="icon">
          <i class="fas fa-stethoscope"></i>
        </div>
        <h3>Diagnostic Services Coming Soon</h3>
        <p>We're preparing a comprehensive diagnostic service management system.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiagnosticServices'
}
</script>

<style scoped>
.diagnostic-services {
  padding: var(--spacing-lg);
  background: var(--background-color);
  min-height: 100vh;
}

.page-header {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-info {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.category-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  box-shadow: var(--shadow-medium);
}

.title-section h1 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
}

.category-description {
  color: var(--text-medium);
  margin: 0;
  font-size: 1.1rem;
}

.coming-soon {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--text-medium);
}

.coming-soon .icon {
  font-size: 4rem;
  color: var(--border-color);
  margin-bottom: var(--spacing-lg);
}

.coming-soon h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.coming-soon p {
  margin: 0;
}
</style>