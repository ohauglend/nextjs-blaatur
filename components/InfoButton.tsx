'use client';

import { useState, useRef, useEffect } from 'react';
import { PARTICIPANT_ASSETS } from '@/data/participant-assets';

export default function InfoButton({ participantId }: { participantId: string }) {
  const assets = PARTICIPANT_ASSETS[participantId];
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking/tapping outside the panel
  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-3 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
        aria-label="Trip information"
        aria-expanded={isOpen}
      >
        <span className="text-xl">ℹ️</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white shadow-2xl rounded-lg p-4 border z-50">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center">
            <span className="mr-2">📋</span>
            Trip Information
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <span>🏨</span>
              <div>
                <p className="font-medium">Hotel Blåtur</p>
                <p className="text-gray-600">123 Adventure Street, Mystery City</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span>📸</span>
              <div>
                <p className="font-medium">Photo Sharing</p>
                <a 
                  href="https://photos.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Photos Album
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span>☁️</span>
              <div>
                <p className="font-medium">Weather Today</p>
                <p className="text-gray-600">Sunny, 22°C</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span>📞</span>
              <div>
                <p className="font-medium">Emergency Contact</p>
                <p className="text-gray-600">Host: +47 123 45 678</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span>📁</span>
              <div>
                <p className="font-medium">Your Documents</p>
                <a 
                  href={assets?.googleDriveLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Drive Folder
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
