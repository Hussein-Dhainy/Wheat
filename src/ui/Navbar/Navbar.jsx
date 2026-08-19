import { Logo } from '../Logo/Logo.jsx'
import { MenuButton } from '../Menu/MenuButton.jsx'
import styles from './Navbar.module.css'

export function Navbar({
  menuOpen = false,
  onToggleMenu,
  reducedMotion = false,
  visible = true,
}) {
  return (
    <header className={`${styles.navbar} ${visible ? styles.visible : ''}`}>
      {visible ? (
        <>
          <MenuButton
            onClick={onToggleMenu}
            open={menuOpen}
            reducedMotion={reducedMotion}
          />
          <Logo reducedMotion={reducedMotion} size={1.4} />
        </>
      ) : null}
    </header>
  )
}
