export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-dark to-brand-main flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="text-lg font-bold">
                Split<span className="text-brand-light">Right</span>
              </span>
            </div>
            <p className="text-surface-400 text-sm leading-relaxed">
              Smart expense splitting &amp; settlement. Powered by intelligent algorithms.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-surface-300 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2.5 text-sm text-surface-400">
              <li><a href="/dashboard" className="hover:text-brand-light transition-colors">Dashboard</a></li>
              <li><a href="/groups" className="hover:text-brand-light transition-colors">Groups</a></li>
              <li><a href="/expenses" className="hover:text-brand-light transition-colors">Expenses</a></li>
              <li><a href="/settlements" className="hover:text-brand-light transition-colors">Settlements</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-surface-300 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm text-surface-400">
              <li><a href="#" className="hover:text-brand-light transition-colors">About</a></li>
              <li><a href="#" className="hover:text-brand-light transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-brand-light transition-colors">Terms</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-surface-300 uppercase tracking-wider">Connect</h4>
            <div className="flex gap-3">
              {['github', 'twitter', 'discord'].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400 hover:bg-brand-dark hover:text-white transition-all"
                >
                  <i className={`ri-${icon}-fill text-lg`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-surface-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-surface-500 text-sm">&copy; 2026 SplitRight. All rights reserved.</p>
          <p className="text-surface-600 text-xs">Built with Next.js · Django · Firebase</p>
        </div>
      </div>
    </footer>
  );
}
