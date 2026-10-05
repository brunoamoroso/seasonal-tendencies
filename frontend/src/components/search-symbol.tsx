import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { searchSymbol } from "#/api/api";
import { useState } from "react";


type YahooSearchResponse = {
  quotes: {
    symbol: string;
    shortname: string;
    typeDisp: string;
    exchDisp: string;
  }[];
}


function SearchSymbol({ loadSymbol }: { loadSymbol: (symbol: string) => void }) {
  const [searchResults, setSearchResults] = useState<YahooSearchResponse>({ quotes: [] });
  const [inputSymbol, setInputSymbol] = useState("DX-Y.NYB");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleChangeSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const results = await searchSymbol(e.target.value);
    const filteredResults = results.quotes.filter((item: { symbol?: string }) => item.symbol !== undefined);
    setSearchResults({ quotes: filteredResults });
  };

  const handleLoadSymbol = (symbol: string) => {
    loadSymbol(symbol);
    setInputSymbol(symbol);
    setDialogOpen(false);
  };

  return (
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogTrigger>
      <input
        id="symbol"
        className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm font-medium uppercase shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        value={inputSymbol}
      />
    </DialogTrigger>
    <DialogContent className="sm:max-w-none w-10/12" showCloseButton={false}>
      <div className="flex items-center">
        <Search size={16} className="stroke-neutral-400"/>
        <input
          id="symbol"
          className="h-10 min-w-0 flex-1 rounded-md bg-transparent border-none px-3 text-sm font-medium  outline-none"
          // disabled={isLoading}
          onChange={(event) => handleChangeSearch(event)}
          placeholder="Symbol or Asset name"
          // value={inputSymbol}
        />
      </div>
      <div className="flex flex-col">
        {searchResults.quotes.length === 0 && (
          <div className="p-2 text-sm text-gray-500 flex justify-center">Nothing to see here yet.</div>
        )}
        {searchResults.quotes.map((result) => (
          <div key={result.symbol} onClick={() => handleLoadSymbol(result.symbol)} className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer">
            <div className="flex flex-col">
              <span className="font-medium">{result.symbol}</span>
              <span className="text-sm text-gray-500">{result.shortname}</span>
            </div>
            <div className="text-sm text-gray-500">
              <span className="ml-2">{result.typeDisp}</span>
              <span> / {result.exchDisp}</span>
            </div>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog> 
  )
}

export { SearchSymbol };