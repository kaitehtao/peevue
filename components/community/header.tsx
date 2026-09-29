"use client";
export function Header() {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <img
          className="brand-mark"
          src="/peevue-seat-p.png"
          alt=""
          width={44}
          height={44}
        />
        peevue<span className="brand-period">.com</span>
      </a>
      <nav>
        <a href="/#explore">Explore bathrooms</a>
        <a href="/#community">Our community</a>
      </nav>
      <a className="account-link" href="/account">
        My account
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <a className="brand" href="/">
        <img
          className="brand-mark"
          src="/peevue-seat-p.png"
          alt=""
          width={36}
          height={36}
        />
        peevue.com
      </a>
      <span>Better bathroom breaks, together.</span>
      <a href="/admin">Admin portal</a>
    </footer>
  );
}
