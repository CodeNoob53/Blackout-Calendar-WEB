import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle } from 'lucide-react';
import { searchAddress } from '../services/api';
import { Address } from '../types';

interface AddressSearchProps {
  onSelectQueue: (queue: string) => void;
  currentQueue: string | null;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ onSelectQueue, currentQueue }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        setLoading(true);
        try {
          const data = await searchAddress(query);
          setResults(data.addresses || []);
          setIsOpen(true);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (address: Address) => {
    onSelectQueue(address.queue);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="w-full relative z-20">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-4 border border-white/5 rounded-xl leading-5 bg-gray-900/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 sm:text-sm transition-all shadow-inner"
          placeholder="Введіть назву вулиці..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
             <div className="animate-spin h-4 w-4 border-2 border-amber-500 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute mt-2 w-full bg-[#1e293b] shadow-2xl max-h-60 rounded-xl py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-700 z-50">
          {results.map((addr) => (
            <button
              key={addr.id}
              onClick={() => handleSelect(addr)}
              className="w-full text-left cursor-pointer select-none relative py-3 pl-4 pr-4 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 last:border-0 group"
            >
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-amber-500/70 group-hover:text-amber-500 mr-3 mt-0.5 flex-shrink-0 transition-colors" />
                <div>
                  <span className="block truncate font-medium text-gray-200">
                    {addr.full_address}
                  </span>
                  <span className="block truncate text-xs text-gray-500 mt-0.5 group-hover:text-gray-400">
                    Черга: <span className="text-amber-400 font-bold">{addr.queue}</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && results.length === 0 && !loading && (
         <div className="absolute mt-2 w-full bg-[#1e293b] shadow-xl rounded-xl py-6 text-center border border-gray-700 text-gray-500 z-50">
           Нічого не знайдено
         </div>
      )}

      {currentQueue && (
        <div className="mt-3 flex items-center text-sm text-green-400 bg-green-500/10 p-3 rounded-xl border border-green-500/10 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 mr-2" />
          Обрано чергу: <span className="font-bold ml-1">{currentQueue}</span>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;