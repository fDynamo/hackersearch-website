"use client";

import { ChangeEvent, useRef, useState } from "react";
import styles from "./page.module.scss";
import { SearchResultObj } from "@/utilities/customTypes";
import { sendAPISearchRequest } from "@/utilities/useAPI";
import { DUMMY_RESULTS } from "@/utilities/dummy";
import useSessionStorage from "./hooks/useSessionStorage";

const socialFilters: { label: string; value: string }[] = [
  { label: "facebook", value: "facebook" },
  { label: "X / Twitter", value: "twitter" },
  { label: "instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
  { label: "discord", value: "discord" },
];

const SM_IMG_MAP: { [smStr: string]: string } = {
  email: "/si_email.png",
  facebook: "/si_facebook.png",
  discord: "/si_discord.png",
  youtube: "/si_youtube.png",
  tiktok: "/si_tiktok.png",
  instagram: "/si_instagram.png",
  twitter: "/si_twitter.png",
};

const FULL_SM_LIST = [
  "email",
  "facebook",
  "discord",
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSortType, setSearchSortType] = useState("recent");
  const hasChangedSortType = useRef(false);

  const [searchResults, setSearchResults] =
    useState<SearchResultObj[]>(DUMMY_RESULTS);
  const [smList, setSmList] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [
    lastQueryEmbeddings,
    setLastQueryEmbeddings,
    isLastQueryEmbeddingsLoaded,
    clearLastQueryEmbeddings,
  ] = useSessionStorage<string>("last-query-embeddings", "");

  // Event handlers
  const handleSearchClick = async () => {
    // TODO: Validate

    setLoadingSearch(true);

    let payload: any = {
      sm_list: smList,
      concat_type: "AND", // TODO
      sorted_by: searchSortType,
      pagination: {
        // TODO
        pageSize: 10,
        page: 1,
      },
    };

    if (lastQueryEmbeddings) {
      payload = {
        ...payload,
        search_query_type: "vs",
        search_query_embedding: lastQueryEmbeddings,
      };
    } else if (searchQuery) {
      payload = {
        ...payload,
        search_query_type: "vs",
        search_query: searchQuery,
      };
    }

    // TODO: Only send if we have changed stuff
    const res = await sendAPISearchRequest(payload);

    setLoadingSearch(false);
    if (res.isError) {
      // TODO
      window.alert("Something went wrong, please try again later");
      console.error(res.error);
      return;
    }

    // TODO: Handle pagination
    setSearchResults(res.data.results);

    if (res.data.extra?.generated_query_vector) {
      setLastQueryEmbeddings(res.data.extra?.generated_query_vector);
    }
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!hasChangedSortType.current) {
      hasChangedSortType.current = true;
    }

    const newVal = e.target.value;
    setSearchSortType(newVal);
  };

  const handleSearchQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (!newVal && searchSortType == "relevant") {
      setSearchSortType("recent");
    }
    if (newVal && !hasChangedSortType.current) {
      setSearchSortType("relevant");
    }
    clearLastQueryEmbeddings();

    setSearchQuery(newVal);
  };

  const handleSocialControlClick = (socialVal: string) => {
    setSmList((curr) => {
      const newVal = [...curr];
      const idx = newVal.indexOf(socialVal);
      if (idx > -1) {
        newVal.splice(idx, 1);
      } else {
        newVal.push(socialVal);
      }
      return newVal;
    });
  };

  // Render functions
  const renderResultSmList = (searchObj: SearchResultObj) => {
    const resSmList: { sm: string; url: string }[] = [];

    if (searchObj.sm_email) {
      resSmList.push({ sm: "email", url: "mailto:" + searchObj.sm_email });
    }
    if (searchObj.sm_twitter) {
      resSmList.push({ sm: "twitter", url: searchObj.sm_twitter });
    }
    if (searchObj.sm_instagram) {
      resSmList.push({ sm: "instagram", url: searchObj.sm_instagram });
    }
    if (searchObj.sm_tiktok) {
      resSmList.push({ sm: "tiktok", url: searchObj.sm_tiktok });
    }
    if (searchObj.sm_youtube) {
      resSmList.push({ sm: "youtube", url: searchObj.sm_youtube });
    }
    if (searchObj.sm_discord) {
      resSmList.push({ sm: "discord", url: searchObj.sm_discord });
    }
    if (searchObj.sm_facebook) {
      resSmList.push({ sm: "facebook", url: searchObj.sm_facebook });
    }

    return resSmList.map((smObj) => {
      const { url, sm } = smObj;
      const fUrl = url;
      return (
        <a
          key={searchObj.product_url + "-sm-" + sm}
          href={fUrl}
          target="_blank"
          className={styles["result-block__sm-icon-link"]}
        >
          <img src={SM_IMG_MAP[sm]} alt="" />
        </a>
      );
    });
  };

  const renderResults = () => {
    return searchResults.map((searchObj) => {
      const popularityString = "90 / 100"; // TODO
      let imgUrl = "";
      if (searchObj.product_image_file_name) {
        imgUrl =
          process.env.NEXT_PUBLIC_IMAGE_BUCKET_URL +
          searchObj.product_image_file_name;
      }
      return (
        <div className={styles["result-block"]} key={searchObj.product_url}>
          <a
            className={styles["result-block__head-link"]}
            href={"https://" + searchObj.product_url}
            target="_blank"
          >
            <div className={styles["result-block__head"]}>
              <img
                src={imgUrl}
                alt=""
                className={styles["result-block__img"]}
              />
              <div className={styles["result-block__head-copy"]}>
                <span className={styles["result-block__url-text"]}>
                  {searchObj.product_url}
                </span>
                <span className={styles["result-block__name"]}>
                  {searchObj.product_name}
                </span>
              </div>
            </div>
          </a>
          <p className={styles["result-block__description"]}>
            {searchObj.product_description}
          </p>
          <p className={styles["result-block__popularity"]}>
            <span className={styles["result-block__popularity-label"]}>
              popularity:
            </span>{" "}
            {popularityString}
          </p>
          <div className={styles["result-block__sm-list"]}>
            {renderResultSmList(searchObj)}
          </div>
        </div>
      );
    });
  };

  const renderSocialControls = () => {
    return socialFilters.map((obj) => {
      const imgFilePath = SM_IMG_MAP[obj.value];
      return (
        <div
          key={obj.value}
          className={styles["social__control"]}
          onClick={(e) => handleSocialControlClick(obj.value)}
        >
          <input
            type="checkbox"
            checked={smList.includes(obj.value)}
            readOnly
          />
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
          <div className={styles["nav__container"]}>
            <a href="https://test.com">about</a>
            <a href="https://test.com">contact</a>
            <a href="https://test.com">pricing</a>
            <a href="https://test.com">suggest a feature</a>
            <a href="https://test.com">survey</a>
            <button className={styles["sign-in-button"]}>sign in</button>
          </div>
        </nav>
      </header>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles["hero"]}>
            <h1>hackersearch</h1>
            <h2>
              find tech businesses filtered by their social media accounts
            </h2>
          </div>
          <div className={styles["socials"]}>{renderSocialControls()}</div>
          <input
            type="text"
            className={styles["search-input"]}
            value={searchQuery}
            onChange={handleSearchQueryChange}
            placeholder="Describe a business / product to narrow down search (optional)"
          />
          <div className={styles["advanced-options"]}>
            <button className={styles["advanced-options-button"]}>
              advanced options
            </button>
          </div>
          <div className={styles["search-action"]}>
            <button
              className={styles["search-button"]}
              onClick={handleSearchClick}
            >
              search
            </button>
          </div>
          <div className={styles["result-controls"]}>
            <select
              onChange={handleSortChange}
              value={searchSortType}
              className={styles["sort-input"]}
            >
              <option value="recent">Recently added</option>
              <option value="popular">Popularity</option>
              {!!searchQuery && <option value="relevant">Relevance</option>}
            </select>
          </div>
          {!!searchResults.length && (
            <div className={styles["results-list"]}>{renderResults()}</div>
          )}
        </div>
      </main>
    </>
  );
}
