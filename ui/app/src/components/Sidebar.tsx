import { useState } from "react";
import { ADVANCED_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "../state/navigation";
import { useNavigation } from "../state/navigationContext";

export default function Sidebar() {
  const { activeScreen, setActiveScreen } = useNavigation();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="brand">SkillSpring Quantum</div>
      <nav className="nav">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={activeScreen === item.id ? "nav-btn active" : "nav-btn"}
            onClick={() => setActiveScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-secondary">
        <button
          className={advancedOpen ? "nav-btn more-btn active" : "nav-btn more-btn"}
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
        >
          {advancedOpen ? "Hide More Tools" : "More Tools"}
        </button>
        <p className="muted sidebar-note">
          Advanced controls for power users live here when you need deeper review, governance, or database access.
        </p>
        {advancedOpen ? (
          <nav className="nav nav-secondary">
            {ADVANCED_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={activeScreen === item.id ? "nav-btn active" : "nav-btn"}
                onClick={() => setActiveScreen(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </aside>
  );
}
