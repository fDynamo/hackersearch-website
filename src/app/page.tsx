"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.scss";
import { SearchResultObj } from "@/utilities/customTypes";
import { sendAPISearchRequest } from "@/utilities/useAPI";
import { DUMMY_RESULTS } from "@/utilities/dummy";
import useSessionStorage from "./hooks/useSessionStorage";
import SafeImage from "@/components/SafeImage";
import ModalBase from "@/components/ModalBase";

const socialFilters: { label: string; value: string }[] = [
  { label: "facebook", value: "facebook" },
  { label: "X / Twitter", value: "twitter" },
  { label: "instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
  { label: "discord", value: "discord" },
  { label: "Reddit", value: "reddit" },
  { label: "LinkedIn", value: "linkedin" },
];

const SM_IMG_MAP: { [smStr: string]: string } = {
  email: "/si_email.png",
  facebook: "/si_facebook.png",
  discord: "/si_discord.png",
  youtube: "/si_youtube.png",
  tiktok: "/si_tiktok.png",
  instagram: "/si_instagram.png",
  twitter: "/si_twitter.png",
  reddit: "/si_reddit.png",
  linkedin: "/si_linkedin.png",
};

const INITIAL_PAGE_NUM = 1;
const PAGE_SIZE = 50;
const MAX_PAGE_NUM = 5;
export default function Home() {
  const [searchResults, setSearchResults] =
    useState<SearchResultObj[]>(DUMMY_RESULTS);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);
  const [isModifiedSearch, setIsModifiedSearch] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [pageNum, setPageNum] = useState(INITIAL_PAGE_NUM);

  // search settings
  const [smList, setSmList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSortType, setSearchSortType] = useState("recent");
  const hasChangedSortType = useRef(false);
  const [searchConcatType, setSearchConcatType] = useState<"AND" | "OR">("AND");
  const [searchQueryType, setSearchQueryType] = useState<"auto" | "vs" | "ft">(
    "auto"
  );

  const [
    lastQueryEmbeddings,
    setLastQueryEmbeddings,
    isLastQueryEmbeddingsLoaded,
    clearLastQueryEmbeddings,
  ] = useSessionStorage<string>("last-query-embeddings", "");

  const [selectedResults, setSelectedResults] = useState<SearchResultObj[]>([]);

  useEffect(() => {
    setIsModifiedSearch(true);
    setPageNum(INITIAL_PAGE_NUM);
    setHasMoreResults(true);
  }, [searchQuery, searchSortType, searchConcatType, searchQueryType, smList]);

  // Special functions

  // Executes search based on search param states
  const executeSearch = async (overrides?: any, options?: any) => {
    if (isLoadingSearch) return;

    // TODO: Validate
    setIsLoadingSearch(true);

    const isModified = isModifiedSearch;
    if (!isModified && !hasMoreResults) return;

    // Handle overrides
    let fSortType = searchSortType;
    if (overrides?.searchSortType) {
      fSortType = overrides.searchSortType;
    }

    let fPageNum = INITIAL_PAGE_NUM;
    if (overrides?.pageNum) {
      fPageNum = overrides.pageNum;
    }

    let payload: any = {
      sm_list: smList,
      concat_type: searchConcatType, // TODO
      sorted_by: fSortType,
      pagination: {
        pageSize: PAGE_SIZE,
        page: fPageNum,
      },
    };

    // Determine search query type
    let fSearchQueryType = searchQueryType;
    if (fSearchQueryType == "auto") {
      if (searchQuery.split(" ").length > 3) {
        fSearchQueryType = "vs";
      } else {
        fSearchQueryType = "ft";
      }
    }

    if (fSearchQueryType == "vs" && lastQueryEmbeddings) {
      payload = {
        ...payload,
        search_query_type: fSearchQueryType,
        search_query_embedding: lastQueryEmbeddings,
      };
    } else if (searchQuery) {
      payload = {
        ...payload,
        search_query_type: fSearchQueryType,
        search_query: searchQuery,
      };
    }

    const res = await sendAPISearchRequest(payload);

    setIsLoadingSearch(false);
    setHasSearchedOnce(true);

    if (isModified && !options?.keepSelected) {
      setSelectedResults([]);
    }

    if (res.isError) {
      // TODO
      window.alert("Something went wrong, please try again later");
      console.error(res.error);
      return;
    }

    setIsModifiedSearch(false);
    const newResults = res.data.results;

    if (isModified) setSearchResults(newResults);
    else
      setSearchResults((curr) => {
        const toReturn = [...curr];
        newResults.forEach((obj) => {
          const idx = toReturn.findIndex(
            (val) => val.product_url == obj.product_url
          );
          if (idx === -1) {
            toReturn.push(obj);
          }
        });
        return toReturn;
      });

    if (res.data.extra?.generated_query_vector) {
      setLastQueryEmbeddings(res.data.extra?.generated_query_vector);
    }

    if (newResults.length < PAGE_SIZE) {
      setHasMoreResults(false);
    }
  };

  // Event handlers
  const handleSearchClick = async () => {
    executeSearch();
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!hasChangedSortType.current) {
      hasChangedSortType.current = true;
    }

    const newVal = e.target.value;
    setSearchSortType(newVal);
    if (searchResults.length) {
      setTimeout(() => {
        executeSearch({ searchSortType: newVal, pageNum: 0 });
      }, 1);
    }
  };

  const handleChangeSearchInput = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleKeyDownSearchInput = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") {
      if (searchQuery) executeSearch();
      e.preventDefault();
    }
  };

  const handleClickSocialControl = (socialVal: string) => {
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

  const openAdvancedOptions = () => {
    document.body.style.overflow = "hidden";
    setIsAdvancedOptionsOpen(true);
  };

  const closeAdvancedOptions = () => {
    document.body.style.overflow = "scroll";
    setIsAdvancedOptionsOpen(false);
  };

  const handleSelectSearchConcatTypeChange = (
    e: ChangeEvent<HTMLSelectElement>
  ) => {
    const newVal = e.target.value;
    setSearchConcatType(newVal as "AND" | "OR");
  };

  const handleSelectSearchQueryTypeChange = (
    e: ChangeEvent<HTMLSelectElement>
  ) => {
    const newVal = e.target.value;
    setSearchQueryType(newVal as "auto" | "ft" | "vs");
  };

  const handleClickExport = () => {
    setIsExportOptionsOpen(true);
  };

  const handleClickMoreResults = () => {
    let newPageNum = pageNum + 1;

    setPageNum(newPageNum);
    executeSearch({ pageNum: newPageNum }, { keepSelected: true });
  };

  const handleResultSelect = (selectedObj: SearchResultObj) => {
    setSelectedResults((curr) => {
      const newList = [...curr];
      const tmpIdx = newList.findIndex(
        (e) => e.product_url == selectedObj.product_url
      );
      if (tmpIdx == -1) {
        newList.push(selectedObj);
      } else {
        newList.splice(tmpIdx, 1);
      }
      return newList;
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
    if (searchObj.sm_reddit) {
      resSmList.push({ sm: "reddit", url: searchObj.sm_reddit });
    }
    if (searchObj.sm_linkedin) {
      resSmList.push({ sm: "linkedin", url: searchObj.sm_linkedin });
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

  const getDateString = (inDateStr: string) => {
    const dateObj = new Date(inDateStr);

    return Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(dateObj);
  };

  const renderResults = () => {
    return searchResults.map((searchObj) => {
      const popularityString = searchObj.popularity;
      let popularityClassName = "low";
      if (popularityString.includes("medium")) {
        popularityClassName = "mid";
      }
      if (
        popularityString.includes("high") ||
        popularityString.includes("excellent")
      ) {
        popularityClassName = "high";
      }

      let imgUrl = "";
      if (searchObj.product_image_file_name) {
        imgUrl =
          process.env.NEXT_PUBLIC_IMAGE_BUCKET_URL +
          searchObj.product_image_file_name;
      }

      let description = searchObj.product_description;
      const MAX_DESCRIPTION_LENGTH = 450;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        description = description.slice(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
      }

      const isSelected = !!selectedResults.find(
        (e) => e.product_url === searchObj.product_url
      );

      return (
        <div className={styles["result-block"]} key={searchObj.product_url}>
          <div className={styles["result-block__head"]}>
            <a
              className={styles["result-block__head-link"]}
              href={"https://" + searchObj.product_url}
              target="_blank"
            >
              <SafeImage
                src={imgUrl}
                alt=""
                className={styles["result-block__img"]}
              />
            </a>
            <a
              className={styles["result-block__head-link"]}
              href={"https://" + searchObj.product_url}
              target="_blank"
            >
              <div className={styles["result-block__head-copy"]}>
                <span className={styles["result-block__url-text"]}>
                  {searchObj.product_url}
                </span>
                <span className={styles["result-block__name"]}>
                  {searchObj.product_name}
                </span>
              </div>
            </a>
            <div className={styles["result-block__head-select-container"]}>
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                onClick={() => handleResultSelect(searchObj)}
              />
            </div>
          </div>
          <p className={styles["result-block__description"]}>{description}</p>
          <div className={styles["result-block__info-container"]}>
            <p className={styles["result-block__date"]}>
              {getDateString(searchObj.ph_listed_at)}
            </p>
            <p
              className={
                styles["result-block__popularity"] +
                " " +
                styles[popularityClassName]
              }
            >
              <span className={styles["result-block__popularity-label"]}>
                popularity:
              </span>{" "}
              {popularityString}
            </p>
          </div>
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
          onClick={() => handleClickSocialControl(obj.value)}
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

  // Modal renders
  const modalAdvancedOptions = () => (
    <ModalBase
      title="Advanced options"
      onClose={closeAdvancedOptions}
      closeOnBgClick
      isOpen={isAdvancedOptionsOpen}
    >
      <>
        <div className={styles["advanced-options__config"]}>
          <select
            onChange={handleSelectSearchConcatTypeChange}
            value={searchConcatType}
          >
            <option value="AND">all</option>
            <option value="OR">at least one</option>
          </select>
          <span>
            Businesses must have ___ of the selected social media accounts
          </span>
          <select
            onChange={handleSelectSearchQueryTypeChange}
            value={searchQueryType}
          >
            <option value="auto">auto</option>
            <option value="ft">full text / keywords</option>
            <option value="vs">vector semantic</option>
          </select>
          <span>Method to use for product description search queries</span>
        </div>
        <p className={styles["advanced-options__disclaimer-text"]}>
          All changes are auto-saved
        </p>
      </>
    </ModalBase>
  );

  // Main render
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
            onChange={handleChangeSearchInput}
            placeholder="Describe a business / product to narrow down search (optional)"
            onKeyDown={handleKeyDownSearchInput}
          />
          <div className={styles["below-search-input"]}>
            <button
              className={styles["more-button"]}
              onClick={openAdvancedOptions}
            >
              advanced options
            </button>
            {modalAdvancedOptions()}
          </div>
          <div className={styles["search-action"]}>
            <button
              className={styles["search-button"]}
              onClick={handleSearchClick}
              disabled={isLoadingSearch}
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
            <>
              <div className={styles["export-controls"]}>
                <button
                  className={styles["export__button"]}
                  onClick={handleClickExport}
                  disabled={isLoadingSearch}
                >
                  export
                </button>
              </div>
              <div className={styles["results-list"]}>
                {renderResults()}
                {hasSearchedOnce &&
                  hasMoreResults &&
                  pageNum < MAX_PAGE_NUM && (
                    <div className={styles["more-results"]}>
                      <button
                        className={styles["more-results__button"]}
                        onClick={handleClickMoreResults}
                        disabled={isLoadingSearch}
                      >
                        more results
                      </button>
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
