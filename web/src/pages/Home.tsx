import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="container mx-auto px-4 py-16">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        AccessAI
                    </h1>
                    <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                        AI-powered accessibility checker for indoor spaces. Design, analyze, and improve your space for everyone.
                    </p>
                    <Link
                        to="/editor"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                    >
                        Start Designing
                    </Link>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <div className="text-3xl mb-4">🏗️</div>
                        <h3 className="text-xl font-semibold mb-2">3D Floor Editor</h3>
                        <p className="text-slate-400">
                            Design your space with walls, doors, ramps, and furniture in an intuitive 3D editor.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <div className="text-3xl mb-4">🤖</div>
                        <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
                        <p className="text-slate-400">
                            Get instant accessibility feedback powered by Gemini AI with natural language explanations.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <div className="text-3xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold mb-2">Compliance Reports</h3>
                        <p className="text-slate-400">
                            Generate PDF reports for ADA compliance verification and regulatory submissions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
