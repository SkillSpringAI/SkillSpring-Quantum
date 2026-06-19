import { PRIMARY_NAV_ITEMS } from "../state/navigation";
import { useNavigation } from "../state/navigationContext";

export default function Sidebar() {
  const { activeScreen, setActiveScreen } = useNavigation();

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
    </aside>
  );
}
