export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL

  if (!backendUrl) {
    return res.status(503).json({ error: 'BACKEND_URL not configured' })
  }

  const url = `${backendUrl}${req.url}`

  const fetchOptions = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
  }

  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    fetchOptions.body = JSON.stringify(req.body)
  }

  try {
    const response = await fetch(url, fetchOptions)
    const text = await response.text()

    res.status(response.status).setHeader('Content-Type', 'application/json')

    try {
      return res.json(JSON.parse(text))
    } catch {
      return res.send(text)
    }
  } catch {
    return res.status(503).json({ error: 'Backend unavailable. Verifique se o servidor local está rodando.' })
  }
}
