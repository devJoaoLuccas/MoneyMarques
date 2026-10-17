import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { notify } from '../shared/lib/toast'

// jsdom nao implementa a captura de ponteiro que o sonner usa ao arrastar/fechar um aviso.
Element.prototype.setPointerCapture ??= () => undefined
Element.prototype.releasePointerCapture ??= () => undefined

afterEach(() => {
  cleanup()
  notify.dismissAll()
  window.history.replaceState(null, '', '/')
})
