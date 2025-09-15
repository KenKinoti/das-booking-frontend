<template>
  <div class="faq-page">
    <!-- Hero Section -->
    <div class="faq-hero">
      <div class="hero-content">
        <div class="hero-icon">
          <i class="fas fa-question-circle"></i>
        </div>
        <h1 class="hero-title">Frequently Asked Questions</h1>
        <p class="hero-subtitle">Find answers to common questions and learn how to make the most of DAS Booking</p>

        <!-- Search Bar -->
        <div class="faq-search">
          <div class="search-wrapper">
            <i class="fas fa-search"></i>
            <input
              v-model="searchQuery"
              @input="filterFAQs"
              type="text"
              placeholder="Search for help topics..."
              class="search-input"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Navigation -->
    <div class="quick-nav">
      <div class="nav-container">
        <h3>Browse by Category</h3>
        <div class="category-grid">
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-card"
            :class="{ active: selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <div class="category-icon">
              <i :class="category.icon"></i>
            </div>
            <h4>{{ category.name }}</h4>
            <p>{{ category.description }}</p>
            <span class="question-count">{{ category.questions.length }} questions</span>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ Content -->
    <div class="faq-content">
      <div class="content-container">
        <!-- Category Title -->
        <div v-if="selectedCategory" class="category-header">
          <div class="category-info">
            <i :class="getCurrentCategory().icon"></i>
            <h2>{{ getCurrentCategory().name }}</h2>
          </div>
          <button @click="selectedCategory = null" class="back-btn">
            <i class="fas fa-arrow-left"></i>
            View All Categories
          </button>
        </div>

        <!-- FAQ Items -->
        <div class="faq-list">
          <div
            v-for="(question, index) in filteredQuestions"
            :key="question.id"
            class="faq-item"
            :class="{ open: openItems.includes(question.id) }"
          >
            <div class="faq-question" @click="toggleQuestion(question.id)">
              <div class="question-content">
                <h3>{{ question.question }}</h3>
                <div class="question-meta">
                  <span class="category-tag">{{ getCategoryName(question.category) }}</span>
                  <span v-if="question.popular" class="popular-tag">
                    <i class="fas fa-fire"></i> Popular
                  </span>
                </div>
              </div>
              <div class="question-toggle">
                <i class="fas fa-chevron-down"></i>
              </div>
            </div>

            <div class="faq-answer">
              <div class="answer-content" v-html="question.answer"></div>

              <!-- Related Links -->
              <div v-if="question.relatedLinks" class="related-links">
                <h4>Related Topics:</h4>
                <div class="link-grid">
                  <a
                    v-for="link in question.relatedLinks"
                    :key="link.title"
                    :href="link.url"
                    class="related-link"
                  >
                    <i :class="link.icon"></i>
                    {{ link.title }}
                  </a>
                </div>
              </div>

              <!-- Helpful Actions -->
              <div class="answer-actions">
                <button @click="markHelpful(question.id)" class="helpful-btn">
                  <i class="fas fa-thumbs-up"></i>
                  Helpful ({{ question.helpful || 0 }})
                </button>
                <button @click="markNotHelpful(question.id)" class="not-helpful-btn">
                  <i class="fas fa-thumbs-down"></i>
                  Not Helpful
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="filteredQuestions.length === 0" class="no-results">
          <i class="fas fa-search"></i>
          <h3>No results found</h3>
          <p>Try adjusting your search terms or browse all categories</p>
          <button @click="clearSearch" class="clear-search-btn">Clear Search</button>
        </div>
      </div>
    </div>

    <!-- Contact Support -->
    <div class="support-section">
      <div class="support-container">
        <div class="support-content">
          <h3>Still need help?</h3>
          <p>Can't find what you're looking for? Our support team is here to help.</p>
          <div class="support-actions">
            <button class="contact-btn primary">
              <i class="fas fa-envelope"></i>
              Contact Support
            </button>
            <button class="contact-btn secondary">
              <i class="fas fa-video"></i>
              Schedule Demo
            </button>
            <button class="contact-btn secondary">
              <i class="fas fa-book"></i>
              User Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FAQ',
  data() {
    return {
      searchQuery: '',
      selectedCategory: null,
      openItems: [],

      categories: [
        {
          id: 'getting-started',
          name: 'Getting Started',
          description: 'Learn the basics of using DAS Booking',
          icon: 'fas fa-play-circle',
          questions: [
            {
              id: 1,
              category: 'getting-started',
              question: 'How do I create my first booking?',
              popular: true,
              answer: `
                <p>Creating your first booking is simple:</p>
                <ol>
                  <li>Navigate to the <strong>Bookings</strong> page from the sidebar</li>
                  <li>Click the <strong>"Create Booking"</strong> button</li>
                  <li>Select your customer (or create a new one)</li>
                  <li>Choose the service and staff member</li>
                  <li>Pick your preferred date and time</li>
                  <li>Add any special notes or requirements</li>
                  <li>Click <strong>"Save Booking"</strong></li>
                </ol>
                <p>Your booking will automatically appear in your calendar and send confirmation notifications.</p>
              `,
              helpful: 45,
              relatedLinks: [
                { title: 'Managing Bookings', url: '#', icon: 'fas fa-calendar' },
                { title: 'Customer Management', url: '#', icon: 'fas fa-users' }
              ]
            },
            {
              id: 2,
              category: 'getting-started',
              question: 'How do I set up my organization profile?',
              answer: `
                <p>Setting up your organization profile helps customers find and book with you:</p>
                <ol>
                  <li>Go to <strong>Settings</strong> > <strong>Organization</strong></li>
                  <li>Add your business name, logo, and contact information</li>
                  <li>Set your business hours and availability</li>
                  <li>Configure your booking policies and cancellation rules</li>
                  <li>Add your services and pricing</li>
                  <li>Set up staff profiles and permissions</li>
                </ol>
                <p>A complete profile builds trust and helps customers make informed booking decisions.</p>
              `,
              helpful: 32
            }
          ]
        },
        {
          id: 'bookings',
          name: 'Bookings & Calendar',
          description: 'Manage appointments and scheduling',
          icon: 'fas fa-calendar-alt',
          questions: [
            {
              id: 3,
              category: 'bookings',
              question: 'How do I handle booking cancellations?',
              popular: true,
              answer: `
                <p>Managing cancellations is straightforward:</p>
                <ol>
                  <li>Open the booking from your calendar or bookings list</li>
                  <li>Click <strong>"Cancel Booking"</strong></li>
                  <li>Select the cancellation reason</li>
                  <li>Choose whether to apply cancellation fees (based on your policies)</li>
                  <li>Send notification to the customer</li>
                </ol>
                <p><strong>Tip:</strong> Set up automated cancellation policies in Settings to handle fees and refunds automatically.</p>
              `,
              helpful: 38
            },
            {
              id: 4,
              category: 'bookings',
              question: 'Can I set recurring appointments?',
              answer: `
                <p>Yes! DAS Booking supports recurring appointments:</p>
                <ol>
                  <li>Create a new booking as usual</li>
                  <li>In the booking form, enable <strong>"Recurring Appointment"</strong></li>
                  <li>Choose your recurrence pattern (daily, weekly, monthly)</li>
                  <li>Set the end date or number of occurrences</li>
                  <li>Save the booking series</li>
                </ol>
                <p>Each appointment in the series can be modified individually if needed.</p>
              `,
              helpful: 29
            }
          ]
        },
        {
          id: 'customers',
          name: 'Customer Management',
          description: 'Handle customer data and relationships',
          icon: 'fas fa-users',
          questions: [
            {
              id: 5,
              category: 'customers',
              question: 'How do I import existing customer data?',
              answer: `
                <p>Import your existing customer database easily:</p>
                <ol>
                  <li>Go to <strong>Customers</strong> > <strong>"Import Customers"</strong></li>
                  <li>Download our CSV template</li>
                  <li>Fill in your customer data following the template format</li>
                  <li>Upload your completed CSV file</li>
                  <li>Review and map the data fields</li>
                  <li>Click <strong>"Import"</strong> to add customers to your system</li>
                </ol>
                <p>Supported formats include CSV, Excel, and direct integrations with popular CRM systems.</p>
              `,
              helpful: 41
            }
          ]
        },
        {
          id: 'payments',
          name: 'Payments & Billing',
          description: 'Process payments and manage invoices',
          icon: 'fas fa-credit-card',
          questions: [
            {
              id: 6,
              category: 'payments',
              question: 'What payment methods are supported?',
              popular: true,
              answer: `
                <p>DAS Booking supports multiple payment options:</p>
                <ul>
                  <li><strong>Credit/Debit Cards:</strong> Visa, Mastercard, American Express</li>
                  <li><strong>Digital Wallets:</strong> Apple Pay, Google Pay, PayPal</li>
                  <li><strong>Bank Transfers:</strong> Direct debit and wire transfers</li>
                  <li><strong>Buy Now, Pay Later:</strong> Afterpay, Zip Pay</li>
                  <li><strong>Cash Payments:</strong> Record in-person cash transactions</li>
                </ul>
                <p>All payments are processed securely with bank-level encryption.</p>
              `,
              helpful: 52
            },
            {
              id: 7,
              category: 'payments',
              question: 'How do I create and send invoices?',
              answer: `
                <p>Creating professional invoices is easy with our new invoice wizard:</p>
                <ol>
                  <li>Go to <strong>Invoices</strong> and click <strong>"Create Amazing Invoice"</strong></li>
                  <li>Choose from 6 professional email-optimized templates</li>
                  <li>Add your business details and logo</li>
                  <li>Select or add customer information</li>
                  <li>Add line items with descriptions, quantities, and rates</li>
                  <li>Preview your invoice and choose delivery method</li>
                  <li>Send via email, generate a shareable link, or save as draft</li>
                </ol>
                <p>Our invoices are designed to look amazing in email and provide a great customer experience.</p>
              `,
              helpful: 36
            }
          ]
        },
        {
          id: 'staff',
          name: 'Staff & Permissions',
          description: 'Manage team members and access control',
          icon: 'fas fa-user-tie',
          questions: [
            {
              id: 8,
              category: 'staff',
              question: 'How do I add new staff members?',
              answer: `
                <p>Adding staff members to your organization:</p>
                <ol>
                  <li>Navigate to <strong>Staff</strong> from the sidebar</li>
                  <li>Click <strong>"Add Staff Member"</strong></li>
                  <li>Enter their personal details and contact information</li>
                  <li>Set their role and permissions level</li>
                  <li>Assign services they can provide</li>
                  <li>Configure their working hours and availability</li>
                  <li>Send them an invitation email to join</li>
                </ol>
                <p>Staff members will receive login credentials and can immediately start managing their bookings.</p>
              `,
              helpful: 27
            }
          ]
        },
        {
          id: 'reports',
          name: 'Reports & Analytics',
          description: 'Track performance and generate insights',
          icon: 'fas fa-chart-bar',
          questions: [
            {
              id: 9,
              category: 'reports',
              question: 'What reports are available?',
              answer: `
                <p>DAS Booking provides comprehensive reporting:</p>
                <ul>
                  <li><strong>Revenue Reports:</strong> Daily, weekly, monthly income tracking</li>
                  <li><strong>Booking Analytics:</strong> Appointment trends and patterns</li>
                  <li><strong>Customer Reports:</strong> Client retention and lifetime value</li>
                  <li><strong>Staff Performance:</strong> Individual productivity metrics</li>
                  <li><strong>Service Analysis:</strong> Most popular services and pricing optimization</li>
                  <li><strong>No-show Reports:</strong> Track and reduce missed appointments</li>
                </ul>
                <p>All reports can be exported to PDF, Excel, or CSV formats.</p>
              `,
              helpful: 33
            }
          ]
        },
        {
          id: 'integrations',
          name: 'Integrations & API',
          description: 'Connect with other tools and platforms',
          icon: 'fas fa-plug',
          questions: [
            {
              id: 10,
              category: 'integrations',
              question: 'What third-party integrations are available?',
              answer: `
                <p>DAS Booking integrates with popular business tools:</p>
                <ul>
                  <li><strong>Accounting:</strong> Xero, QuickBooks, MYOB</li>
                  <li><strong>Marketing:</strong> Mailchimp, Constant Contact, HubSpot</li>
                  <li><strong>Communication:</strong> SMS providers, Email services</li>
                  <li><strong>Calendar:</strong> Google Calendar, Outlook, Apple Calendar</li>
                  <li><strong>Payment:</strong> Stripe, PayPal, Square</li>
                  <li><strong>CRM:</strong> Salesforce, Pipedrive</li>
                </ul>
                <p>We also provide a REST API for custom integrations.</p>
              `,
              helpful: 28
            }
          ]
        }
      ]
    }
  },

  computed: {
    allQuestions() {
      return this.categories.flatMap(cat => cat.questions)
    },

    filteredQuestions() {
      let questions = this.selectedCategory
        ? this.getCurrentCategory().questions
        : this.allQuestions

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase()
        questions = questions.filter(q =>
          q.question.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query)
        )
      }

      return questions
    }
  },

  methods: {
    getCurrentCategory() {
      return this.categories.find(cat => cat.id === this.selectedCategory) || {}
    },

    getCategoryName(categoryId) {
      const category = this.categories.find(cat => cat.id === categoryId)
      return category ? category.name : ''
    },

    selectCategory(categoryId) {
      this.selectedCategory = categoryId === this.selectedCategory ? null : categoryId
      this.openItems = []
    },

    toggleQuestion(questionId) {
      const index = this.openItems.indexOf(questionId)
      if (index > -1) {
        this.openItems.splice(index, 1)
      } else {
        this.openItems.push(questionId)
      }
    },

    filterFAQs() {
      this.selectedCategory = null
      this.openItems = []
    },

    clearSearch() {
      this.searchQuery = ''
      this.selectedCategory = null
      this.openItems = []
    },

    markHelpful(questionId) {
      const question = this.allQuestions.find(q => q.id === questionId)
      if (question) {
        question.helpful = (question.helpful || 0) + 1
        this.$emit('show-notification', 'Thank you for your feedback!', 'success')
      }
    },

    markNotHelpful(questionId) {
      this.$emit('show-notification', 'Thank you for your feedback. We\'ll work to improve this answer.', 'info')
    }
  }
}
</script>

<style scoped>
.faq-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* Hero Section */
.faq-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.faq-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 800px;
  margin: 0 auto;
}

.hero-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.9;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 3rem;
  line-height: 1.5;
}

.faq-search {
  max-width: 500px;
  margin: 0 auto;
}

.search-wrapper {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.search-wrapper i {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 1.1rem;
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3.5rem;
  border: none;
  background: transparent;
  border-radius: 50px;
  font-size: 1rem;
  color: #1e293b;
  outline: none;
}

.search-input::placeholder {
  color: #64748b;
}

/* Quick Navigation */
.quick-nav {
  padding: 4rem 2rem;
  background: white;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
}

.quick-nav h3 {
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 3rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.category-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.category-card:hover,
.category-card.active {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.category-card:hover::before,
.category-card.active::before {
  transform: scaleX(1);
}

.category-icon {
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 1rem;
}

.category-card h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.category-card p {
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.question-count {
  display: inline-block;
  background: #f1f5f9;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* FAQ Content */
.faq-content {
  padding: 2rem;
  background: white;
}

.content-container {
  max-width: 1000px;
  margin: 0 auto;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.category-info i {
  font-size: 2rem;
  color: #667eea;
}

.category-info h2 {
  font-size: 1.875rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

/* FAQ Items */
.faq-list {
  space-y: 1rem;
}

.faq-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
}

.faq-item:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.faq-item.open {
  border-color: #667eea;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.faq-question:hover {
  background: #f8fafc;
}

.question-content {
  flex: 1;
}

.question-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.question-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.category-tag {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.popular-tag {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.question-toggle {
  font-size: 1.25rem;
  color: #64748b;
  transition: transform 0.3s ease;
}

.faq-item.open .question-toggle {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.faq-item.open .faq-answer {
  max-height: 1000px;
}

.answer-content {
  padding: 0 1.5rem 1.5rem;
  color: #475569;
  line-height: 1.6;
}

.answer-content h4 {
  color: #1e293b;
  margin: 1.5rem 0 0.75rem 0;
}

.answer-content ol,
.answer-content ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.answer-content li {
  margin-bottom: 0.5rem;
}

.answer-content strong {
  color: #1e293b;
  font-weight: 600;
}

.related-links {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.related-links h4 {
  font-size: 1rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.related-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #667eea;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.related-link:hover {
  background: #667eea;
  color: white;
  transform: translateY(-1px);
}

.answer-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.helpful-btn,
.not-helpful-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.helpful-btn:hover {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.not-helpful-btn:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

/* No Results */
.no-results {
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
}

.no-results i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-results h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #1e293b;
}

.clear-search-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.clear-search-btn:hover {
  background: #5a67d8;
}

/* Support Section */
.support-section {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  padding: 4rem 2rem;
}

.support-container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.support-content h3 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.support-content p {
  font-size: 1.125rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.support-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.contact-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.contact-btn.primary {
  background: white;
  color: #1e293b;
}

.contact-btn.primary:hover {
  background: #f8fafc;
  transform: translateY(-2px);
}

.contact-btn.secondary {
  background: transparent;
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.contact-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }

  .category-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .question-content h3 {
    font-size: 1rem;
  }

  .support-actions {
    flex-direction: column;
    align-items: center;
  }

  .contact-btn {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
}
</style>