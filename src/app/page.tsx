"use client";

import { useState } from "react";
import styles from "./page.module.scss";

const socialFilters: { label: string; icon: string; value: string }[] = [
  { label: "facebook", icon: "si_facebook", value: "facebook" },
  { label: "X / Twitter", icon: "si_twitter", value: "twitter" },
  { label: "instagram", icon: "si_instagram", value: "instagram" },
  { label: "TikTok", icon: "si_tiktok", value: "tiktok" },
  { label: "YouTube", icon: "si_youtube", value: "youtube" },
  { label: "discord", icon: "si_discord", value: "discord" },
];

export default function Home() {
  const [results, useResults] = useState<any[]>([]);

  const renderResults = () => {
    return null;
  };

  const renderSocialControls = () => {
    return socialFilters.map((obj) => {
      const imgFilePath = "/" + obj.icon + ".png";
      return (
        <div key={obj.value} className={styles.containerSocialControl}>
          <input type="checkbox" />
          <img src={imgFilePath} alt="" />
          <span>{obj.label}</span>
        </div>
      );
    });
  };

  return (
    <>
      <header>
        <nav className={styles.nav}>
          <div className={styles.containerNav}>
            <a href="https://test.com">contact</a>
            <a href="https://test.com">suggest a feature</a>
            <a href="https://test.com">pricing</a>
            <button className={styles.buttonLogin}>login</button>
          </div>
        </nav>
      </header>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.containerHero}>
            <h1>hackersearch</h1>
            <h2>find tech businesses filtered by social media accounts</h2>
          </div>
          <div className={styles.containerSocials}>
            {renderSocialControls()}
          </div>
          <input
            type="text"
            className={styles.inputSearch}
            placeholder="Describe a business / product to narrow down search (optional)"
          />
          <div className={styles.containerAdvancedOptions}></div>
          <div className={styles.containerSearchButtonRow}>
            <button className={styles.searchButton}>search</button>
          </div>
          <div className={styles.containerFilterRow}>
            <select>
              <option value="lol">lol</option>
            </select>
          </div>
          <div className={styles.containerResults}>{renderResults()}</div>
        </div>
      </main>
    </>
  );
}
