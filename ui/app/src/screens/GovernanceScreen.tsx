import { useEffect, useMemo, useState } from "react";
import RuleFileList from "../components/RuleFileList";
import RuleEditor from "../components/RuleEditor";
import GovernanceSaveResult from "../components/GovernanceSaveResult";
import GovernanceComposer from "../components/GovernanceComposer";
import GovernanceLiveSnapshot from "../components/GovernanceLiveSnapshot";
import GovernanceModeSwitcher from "../components/GovernanceModeSwitcher";
import TopicFilterForm from "../components/TopicFilterForm";
import ReviewQueueForm from "../components/ReviewQueueForm";
import type {
  GovernanceRuleContent,
  GovernanceRuleFile,
  GovernanceSaveResult as GovernanceSaveResultType
} from "../types/governance";
import type {
  GovernanceEditorMode,
  ReviewQueueFormState,
  TopicFilterFormState
} from "../types/governanceForms";
import {
  buildReviewQueueJson,
  buildTopicFilterJson,
  parseReviewQueueJson,
  parseTopicFilterJson
} from "../services/governanceFormAdapter";
import {
  loadGovernanceRuleContent,
  loadGovernanceRuleFiles,
  saveGovernanceRule
} from "../services/governanceBridge";
import { generateGovernanceDraft } from "../services/governanceComposer";

export default function GovernanceScreen() {
  const [files, setFiles] = useState<GovernanceRuleFile[]>([]);
  const [selected, setSelected] = useState<GovernanceRuleContent | null>(null);
  const [editorText, setEditorText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [status, setStatus] = useState("Loading governance rule index...");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<GovernanceSaveResultType | null>(null);

  const [mode, setMode] = useState<GovernanceEditorMode>("guided");
  const [instruction, setInstruction] = useState("");
  const [composerStatus, setComposerStatus] = useState("Draft rules in plain language, then preview canonical JSON.");
  const [generatedJson, setGeneratedJson] = useState("");

  const [topicFilterForm, setTopicFilterForm] = useState<TopicFilterFormState>({
    version: "topic-filter-rules.v1",
    include_topics_text: "",
    exclude_topics_text: "",
    exclude_general_by_default: false
  });

  const [reviewQueueForm, setReviewQueueForm] = useState<ReviewQueueFormState>({
    version: "review-queue-rules.v1",
    enabled: true,
    allowed_signal_tiers_text: "high_signal, low_signal",
    minimum_signal_score: 3,
    maximum_signal_score: 4,
    max_redaction_count: 0,
    exclude_private_review: true,
    excluded_topics_text: "",
    collection: "topic_segments"
  });

  const isDirty = useMemo(() => editorText !== liveText, [editorText, liveText]);

  const showTopicFilterForm =
    selected?.file.name === "topic-filter-rules.json" ||
    selected?.file.name === "topic-filter-rules.test.json";

  const showReviewQueueForm =
    selected?.file.name === "review-queue-rules.json";

  useEffect(() => {
    async function loadIndex() {
      const nextFiles = await loadGovernanceRuleFiles();
      setFiles(nextFiles);

      if (nextFiles.length === 0) {
        setStatus("No governance rule files loaded.");
        return;
      }

      setStatus("Loading first governance rule...");
      await handleSelect(nextFiles[0]);
    }

    loadIndex();
  }, []);

  async function loadSelectedFile(file: GovernanceRuleFile) {
    const content = await loadGovernanceRuleContent(file);
    setSelected(content);
    setEditorText(content.rawText);
    setLiveText(content.rawText);
    setGeneratedJson("");
    setInstruction("");
    setComposerStatus("Draft rules in plain language, then preview canonical JSON.");

    if (file.name === "topic-filter-rules.json" || file.name === "topic-filter-rules.test.json") {
      setTopicFilterForm(parseTopicFilterJson(content.rawText));
      setMode("guided");
    } else if (file.name === "review-queue-rules.json") {
      setReviewQueueForm(parseReviewQueueJson(content.rawText));
      setMode("guided");
    } else {
      setMode("raw-json");
    }

    return content;
  }

  async function handleSelect(file: GovernanceRuleFile) {
    setStatus("Loading " + file.name + "...");
    await loadSelectedFile(file);
    setStatus("Loaded " + file.name + ". You can now edit this rule.");
  }

  async function handleSave() {
    if (!selected) return;

    setIsSaving(true);
    setStatus("Submitting governance write...");

    const result = await saveGovernanceRule({
      filePath: selected.file.path,
      rawText: editorText
    });

    setSaveResult(result);
    setStatus(result.message);

    if (result.ok) {
      const refreshed = await loadGovernanceRuleContent(selected.file);
      setSelected(refreshed);
      setEditorText(refreshed.rawText);
      setLiveText(refreshed.rawText);

      if (selected.file.name === "topic-filter-rules.json" || selected.file.name === "topic-filter-rules.test.json") {
        setTopicFilterForm(parseTopicFilterJson(refreshed.rawText));
      } else if (selected.file.name === "review-queue-rules.json") {
        setReviewQueueForm(parseReviewQueueJson(refreshed.rawText));
      }

      setStatus(result.message + " Live rule reloaded.");
    }

    setIsSaving(false);
  }

  function handleGenerateDraft() {
    if (!selected) return;

    const result = generateGovernanceDraft({
      ruleFileName: selected.file.name,
      instruction,
      currentJson: liveText
    });

    setGeneratedJson(result.generatedJson);
    setComposerStatus(result.message);
  }

  function handleUseGenerated() {
    if (!generatedJson.trim()) return;
    setEditorText(generatedJson);
    setMode("raw-json");
    setStatus("Structured draft moved into JSON editor. Review it, then save.");
  }

  function handleResetToLive() {
    setEditorText(liveText);

    if (selected?.file.name === "topic-filter-rules.json" || selected?.file.name === "topic-filter-rules.test.json") {
      setTopicFilterForm(parseTopicFilterJson(liveText));
    } else if (selected?.file.name === "review-queue-rules.json") {
      setReviewQueueForm(parseReviewQueueJson(liveText));
    }

    setStatus("Editor reset to live saved content.");
  }

  function handleUseLiveAsBase() {
    setGeneratedJson(liveText);
    setComposerStatus("Live saved content copied into structured preview/editor base.");
  }

  function applyTopicFilterForm() {
    const nextJson = buildTopicFilterJson(topicFilterForm);
    setEditorText(nextJson);
    setMode("raw-json");
    setStatus("Guided topic filter form applied to JSON editor.");
  }

  function applyReviewQueueForm() {
    const nextJson = buildReviewQueueJson(reviewQueueForm);
    setEditorText(nextJson);
    setMode("raw-json");
    setStatus("Guided review queue form applied to JSON editor.");
  }

  return (
    <section className="governance-grid">
      <div className="governance-main-stack">
        <div className="panel">
          <h2>Advanced Controls</h2>
          <p className="muted">
            Governance is for power users and follow-up tuning. It should not be required for normal importing, archive review, or dataset review.
          </p>
          <p className="muted">
            Come here when imports, diagnostics, or dataset privacy summaries show you a concrete reason to adjust filters, review thresholds, or privacy-sensitive handling.
          </p>
        </div>

        <RuleFileList
          files={files}
          selectedPath={selected?.file.path}
          onSelect={handleSelect}
        />
      </div>

      <div className="governance-main-stack">
        <GovernanceModeSwitcher
          mode={mode}
          onChange={setMode}
        />

        {mode === "guided" && showTopicFilterForm ? (
          <TopicFilterForm
            value={topicFilterForm}
            onChange={setTopicFilterForm}
            onApplyToEditor={applyTopicFilterForm}
            disabled={isSaving}
            active={!!selected}
          />
        ) : null}

        {mode === "guided" && showReviewQueueForm ? (
          <ReviewQueueForm
            value={reviewQueueForm}
            onChange={setReviewQueueForm}
            onApplyToEditor={applyReviewQueueForm}
            disabled={isSaving}
            active={!!selected}
          />
        ) : null}

        {mode === "guided" && !showTopicFilterForm && !showReviewQueueForm ? (
          <div className="panel">
            <h2>Guided Form</h2>
            <p className="muted">
              Guided editing is not yet implemented for this rule file. Use Natural Language or Raw JSON mode.
            </p>
          </div>
        ) : null}

        {mode === "natural-language" ? (
          <GovernanceComposer
            fileName={selected?.file.name}
            instruction={instruction}
            onInstructionChange={setInstruction}
            onGenerate={handleGenerateDraft}
            generatedJson={generatedJson}
            onUseGenerated={handleUseGenerated}
            onUseLiveAsBase={handleUseLiveAsBase}
            status={composerStatus}
            disabled={isSaving}
          />
        ) : null}

        {mode === "raw-json" ? (
          <RuleEditor
            fileName={selected?.file.name}
            value={editorText}
            onChange={setEditorText}
            onSave={handleSave}
            onReset={handleResetToLive}
            status={status}
            disabled={isSaving}
            isDirty={isDirty}
          />
        ) : null}

        <GovernanceLiveSnapshot
          fileName={selected?.file.name}
          rawText={liveText}
        />

        <GovernanceSaveResult result={saveResult} />
      </div>
    </section>
  );
}
