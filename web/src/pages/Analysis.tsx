import { Link } from 'react-router-dom';

export default function Analysis() {
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-xl font-bold text-blue-400">
                        AccessAI
                    </Link>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">Analysis Results</span>
                </div>
                <Link
                    to="/editor"
                    className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                    Back to Editor
                </Link>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="text-center text-slate-500 py-16">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-lg">Analysis results will be displayed here</p>
                    <p className="text-sm mt-2">Phase 3: Accessibility analysis engine</p>
                </div>
            </div>
        </div>
    );
}
