import React from 'react';

export const Search = () => {
  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search..."
        className="bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );
}; 