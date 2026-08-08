import { useState } from 'react'

function App() {
  const [count, setCount] = useState<number>(0)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-gray-900">MenuGram</h1>
      <p className="max-w-md text-sm text-gray-600">
        Menús digitales multi-tenant: pide desde tu móvil, sigue tu pedido en
        tiempo real.
      </p>
      <button
        type="button"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        onClick={() => setCount((value) => value + 1)}
      >
        Contador: {count}
      </button>
    </main>
  )
}

export default App
