const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
	"http://localhost:3001";

export async function getSymbolData(symbol:string){
  return await fetch(`${API_BASE_URL}/data/${symbol}`).then((res) => res.json());
}

export async function searchSymbol(symbol:string){
  return await fetch(`${API_BASE_URL}/data/search/${symbol}`).then((res) => res.json());
}