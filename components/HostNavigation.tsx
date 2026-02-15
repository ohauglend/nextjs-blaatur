import Link from 'next/link';

interface HostNavigationProps {
  token: string;
  currentPage: 'dashboard' | 'preview' | 'controls';
}

export default function HostNavigation({ token, currentPage }: HostNavigationProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <nav className="flex flex-wrap gap-4 justify-center">
        <Link
          href={`/${token}/host`}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            currentPage === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="mr-2">🏠</span>
          Dashboard
        </Link>
        
        <Link
          href={`/${token}/host/preview`}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            currentPage === 'preview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="mr-2">👁️</span>
          Preview All Tiles
        </Link>
        
        <Link
          href={`/${token}/host/controls`}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            currentPage === 'controls'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="mr-2">⚙️</span>
          Host Controls
        </Link>
      </nav>
    </div>
  );
}
