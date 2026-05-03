import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LeftPane from './LeftPane.vue'
import { useFolderStore } from '../stores/folderStore'

// Stub child components to keep tests focused on LeftPane logic
vi.mock('./FolderTree.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./InlineNameInput.vue', () => ({ default: { template: '<div />' } }))

describe('LeftPane.vue — Back button', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Back button is disabled when canGoBack is false', () => {
    const store = useFolderStore()
    // navigationHistory is empty by default → canGoBack is false
    expect(store.canGoBack).toBe(false)

    const wrapper = mount(LeftPane)
    const backBtn = wrapper.find('button[aria-label="Go back"]')

    expect(backBtn.exists()).toBe(true)
    expect(backBtn.attributes('disabled')).toBeDefined()
    expect(backBtn.classes()).toContain('left-pane__back-btn--disabled')
  })

  it('Back button is enabled when canGoBack is true', async () => {
    const store = useFolderStore()
    // Directly push an entry so canGoBack becomes true
    store.navigationHistory.push('some-folder-id')
    expect(store.canGoBack).toBe(true)

    const wrapper = mount(LeftPane)
    const backBtn = wrapper.find('button[aria-label="Go back"]')

    expect(backBtn.exists()).toBe(true)
    expect(backBtn.attributes('disabled')).toBeUndefined()
    expect(backBtn.classes()).not.toContain('left-pane__back-btn--disabled')
  })

  it('clicking the Back button calls store.navigateBack()', async () => {
    const store = useFolderStore()
    // Enable the button so it can be clicked
    store.navigationHistory.push('some-folder-id')

    const navigateBackSpy = vi.spyOn(store, 'navigateBack').mockResolvedValue(undefined)

    const wrapper = mount(LeftPane)
    const backBtn = wrapper.find('button[aria-label="Go back"]')

    await backBtn.trigger('click')

    expect(navigateBackSpy).toHaveBeenCalledOnce()
  })
})
