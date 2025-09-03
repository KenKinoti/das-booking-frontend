import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ModalNotification from '../../components/ModalNotification.vue'

describe('ModalNotification', () => {
  it('renders properly when shown', () => {
    const wrapper = mount(ModalNotification, {
      props: {
        show: true,
        title: 'Test Title',
        message: 'Test Message',
        type: 'info'
      }
    })

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal-title').text()).toBe('Test Title')
    expect(wrapper.find('.modal-message').text()).toBe('Test Message')
    expect(wrapper.find('.modal-info').exists()).toBe(true)
  })

  it('does not render when hidden', () => {
    const wrapper = mount(ModalNotification, {
      props: {
        show: false,
        title: 'Test Title',
        type: 'info'
      }
    })

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('emits confirm event when confirm button is clicked', async () => {
    const wrapper = mount(ModalNotification, {
      props: {
        show: true,
        title: 'Test Title',
        type: 'info'
      }
    })

    await wrapper.find('.btn').trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits cancel event when cancel button is clicked in confirm mode', async () => {
    const wrapper = mount(ModalNotification, {
      props: {
        show: true,
        title: 'Test Title',
        type: 'confirm'
      }
    })

    await wrapper.find('.btn-secondary').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(ModalNotification, {
      props: {
        show: true,
        title: 'Test Title',
        type: 'info',
        showCloseButton: true
      }
    })

    await wrapper.find('.close-button').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows correct icon for different types', () => {
    const types = [
      { type: 'info', expectedClass: 'fas fa-info-circle' },
      { type: 'success', expectedClass: 'fas fa-check-circle' },
      { type: 'warning', expectedClass: 'fas fa-exclamation-triangle' },
      { type: 'error', expectedClass: 'fas fa-exclamation-circle' },
      { type: 'confirm', expectedClass: 'fas fa-question-circle' }
    ]

    types.forEach(({ type, expectedClass }) => {
      const wrapper = mount(ModalNotification, {
        props: {
          show: true,
          title: 'Test Title',
          type
        }
      })

      expect(wrapper.find('.modal-icon i').classes()).toContain(expectedClass.split(' ')[1])
    })
  })
})