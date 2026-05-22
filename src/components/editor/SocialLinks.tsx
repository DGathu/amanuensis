'use client';

import React from 'react';
import { IconName } from '@/lib/icons'; // Adjust path if your icons.ts is elsewhere

// The strict list of networks that our PDF engine has icons for
const AVAILABLE_NETWORKS: IconName[] = [
  "LinkedIn", "GitHub", "X", "Portfolio", "Email", "Phone", "Location"
];

interface LinkInput {
  network: IconName;
  url: string;
}

interface SocialLinksProps {
  links: LinkInput[];
  onChange: (newLinks: LinkInput[]) => void;
}

export default function SocialLinks({ links, onChange }: SocialLinksProps) {
  
  const handleAdd = () => {
    onChange([...links, { network: 'LinkedIn', url: '' }]);
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(links.filter((_, index) => index !== indexToRemove));
  };

  const handleChange = (index: number, field: keyof LinkInput, value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange(newLinks);
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Social & Web Profiles</h3>
      
      {links.length === 0 && (
        <p className="text-sm text-gray-500 italic">No profiles added yet.</p>
      )}

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-3">
            
            {/* The Strict Dropdown */}
            <select
              value={link.network}
              onChange={(e) => handleChange(index, 'network', e.target.value as IconName)}
              className="px-3 py-2 border rounded-md bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 w-1/3"
            >
              {AVAILABLE_NETWORKS.map(network => (
                <option key={network} value={network}>{network}</option>
              ))}
            </select>

            {/* The URL Input */}
            <input
              type="text"
              placeholder="https://..."
              value={link.url}
              onChange={(e) => handleChange(index, 'url', e.target.value)}
              className="px-3 py-2 border rounded-md flex-1 outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Remove Button */}
            <button
              onClick={() => handleRemove(index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Remove profile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 2-2 1-2-1V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
      >
        <span>+ Add Profile</span>
      </button>
    </div>
  );
}