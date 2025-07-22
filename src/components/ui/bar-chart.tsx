
"use client";

import React from 'react';

// A simplified bar chart component to avoid heavy dependencies like recharts.
// This matches the visual style requested by the user.
export const BarChart = ({ data }: { data: { name: string, value: number }[] }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero

    return (
        <div className="w-full h-64 flex items-end justify-around p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700">
            {data.map((item, index) => (
                <div key={index} className="flex flex-col items-center mx-2 h-full justify-end" title={`₹${item.value.toLocaleString('en-IN')}`}>
                    <div
                        className="w-12 rounded-t-md bg-blue-500 hover:bg-blue-600 transition-all duration-300 ease-in-out"
                        style={{ height: `${(item.value / maxValue) * 100}%` }}
                    ></div>
                    <span className="text-sm mt-2 text-gray-700 dark:text-gray-300 font-medium">{item.name}</span>
                </div>
            ))}
        </div>
    );
};
