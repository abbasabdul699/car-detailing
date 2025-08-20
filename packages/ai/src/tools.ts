export type QuoteInput = { vehicleSize: 'S'|'M'|'L'|'XL'; addOns: string[]; condition: string; package: string }
export type QuoteOutput = { priceMin:number; priceMax:number; durationMin:number; lineItems: {label:string; amount:number}[] }

export async function quoteTool(input: QuoteInput): Promise<QuoteOutput> {
  const res = await fetch(`${process.env.APP_URL}/api/quote`, { 
    method:'POST', 
    headers:{'content-type':'application/json'}, 
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('quoteTool failed')
  return res.json()
}

export async function availabilityTool(range: {from:string; to:string}) {
  const url = new URL(`${process.env.APP_URL}/api/availability`)
  url.searchParams.set('from', range.from)
  url.searchParams.set('to', range.to)
  const res = await fetch(url)
  if (!res.ok) throw new Error('availabilityTool failed')
  return res.json()
}

export async function bookTool(payload: {slotId:string; contactId:string; businessId:string}) {
  const res = await fetch(`${process.env.APP_URL}/api/book`, { 
    method:'POST', 
    headers:{'content-type':'application/json'}, 
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('bookTool failed')
  return res.json()
}
