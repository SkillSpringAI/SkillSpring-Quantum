import { useEffect, useState } from "react";
import DbCollectionList from "../components/DbCollectionList";
import DbRecordViewer from "../components/DbRecordViewer";
import type { DbCollection, DbRecord } from "../types/db";
import { listCollections, queryCollection } from "../services/dbBridge";

const PAGE_SIZE = 25;

export default function DbBrowserScreen() {
  const [collections, setCollections] = useState<DbCollection[]>([]);
  const [selected, setSelected] = useState<DbCollection | null>(null);
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Load a collection to inspect stored records.");

  useEffect(() => {
    listCollections().then(setCollections);
  }, []);

  async function loadCollection(c: DbCollection, nextOffset: number) {
    setLoading(true);
    setStatus(
      "Loading " + c.name + " records " + (nextOffset + 1) + " to " + (nextOffset + PAGE_SIZE) + "..."
    );

    const result = await queryCollection({
      outputRoot: "organized_output",
      tier: c.tier,
      collection: c.name,
      limit: PAGE_SIZE,
      offset: nextOffset
    });

    setRecords(result.records);
    setOffset(result.offset ?? nextOffset);
    setTotalRecords(result.totalRecords ?? result.records.length);
    setHasMore(Boolean(result.hasMore));
    setStatus(
      "Loaded " +
        result.records.length +
        " record(s) from " +
        c.name +
        " starting at row " +
        ((result.offset ?? nextOffset) + 1) +
        "."
    );
    setLoading(false);
  }

  async function handleSelect(c: DbCollection) {
    setSelected(c);
    setOffset(0);
    await loadCollection(c, 0);
  }

  async function handlePrevious() {
    if (!selected || offset === 0 || loading) return;
    await loadCollection(selected, Math.max(0, offset - PAGE_SIZE));
  }

  async function handleNext() {
    if (!selected || !hasMore || loading) return;
    await loadCollection(selected, offset + PAGE_SIZE);
  }

  return (
    <section className="screen-grid">
      <DbCollectionList
        collections={collections}
        selected={
          selected ? selected.tier + ":" + selected.name : undefined
        }
        onSelect={handleSelect}
      />

      <div className="panel">
        <h2>DB Browser Status</h2>
        <p className="muted">{status}</p>
        {selected ? (
          <div className="detail-box">
            <strong>Selected Collection</strong>
            <p>{selected.name}</p>
            <p className="muted">Tier: {selected.tier}</p>
            <p className="muted">
              Page: {offset + 1} to {Math.min(offset + records.length, totalRecords || offset + records.length)}
              {" "}of {totalRecords}
            </p>
            <div className="action-bar">
              <button className="primary-btn" onClick={handlePrevious} disabled={loading || offset === 0}>
                Previous
              </button>
              <button className="primary-btn" onClick={handleNext} disabled={loading || !hasMore}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <DbRecordViewer records={records} />
    </section>
  );
}
