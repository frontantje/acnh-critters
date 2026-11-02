import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// iOS Safari only shows :active styles (like the red caught button) when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true })

const app = mount(App, {
  target: /** @type {HTMLElement} */ (document.getElementById('app')),
})

export default app
