import { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  IconButton,
  TextField,
  useSnackbar,
} from "@/components";
import {
  deleteMemory,
  getUserSettings,
  listMemories,
  listRememberedSummaries,
  saveUserSettings,
  type Memory,
} from "@db";
import { SettingsLayout } from "./SettingsLayout";

/**
 * Hai nguồn trí nhớ nằm cạnh nhau: phần bạn tự khai (sửa được, luôn nạp vào
 * prompt) và phần Oraclia tự cô đọng từ các cuộc trò chuyện (chỉ đọc).
 */
export default function MemoryPage() {
  const snackbar = useSnackbar();
  const [value, setValue] = useState("");
  const [summaries, setSummaries] = useState<
    { title: string; summary: string }[]
  >([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forgetting, setForgetting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getUserSettings()
        .then((settings) => setValue(settings.about_you))
        .catch(() => undefined),
      listRememberedSummaries()
        .then(setSummaries)
        .catch(() => setSummaries([])),
      listMemories()
        .then(setMemories)
        .catch(() => setMemories([])),
    ]).finally(() => setLoading(false));
  }, []);

  async function forget(id: string) {
    if (forgetting) return;
    setForgetting(id);
    try {
      await deleteMemory(id);
      setMemories((current) => current.filter((item) => item.id !== id));
    } catch (exception) {
      snackbar({
        message:
          exception instanceof Error ? exception.message : "Không xóa được.",
      });
    } finally {
      setForgetting(null);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await saveUserSettings({ about_you: value.trim() });
      snackbar({ message: "Đã lưu." });
    } catch (exception) {
      snackbar({
        message:
          exception instanceof Error ? exception.message : "Không lưu được.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsLayout
      title="Những gì tôi biết được về bạn"
      description="Những điều này đi kèm mọi cuộc trò chuyện, không riêng cuộc nào."
      actions={
        <Button onClick={save} disabled={busy || loading}>
          {busy ? (
            <span className="flex items-center gap-2">
              <CircularProgress size={18} strokeWidth={3} />
              Đang lưu...
            </span>
          ) : (
            "Lưu"
          )}
        </Button>
      }
    >
      {loading && (
        <div className="grid place-items-center py-10 text-on-surface-variant">
          <CircularProgress size={28} />
        </div>
      )}
      {!loading && (
        <>
          <TextField
            label="Về bạn"
            multiline
            rows={6}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ví dụ: mình 28 tuổi, làm thiết kế, đang cân nhắc chuyển nghề..."
          />

          <section>
            <h2 className="md-title-sm text-on-surface">Tôi đã tự ghi nhớ</h2>
            <p className="mt-1 md-body-sm text-on-surface-variant">
              Oraclia tự lưu những điều này khi bạn ngừng gõ một lúc. Xóa cái
              nào là quên hẳn cái đó.
            </p>
            {memories.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {memories.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-xl border border-outline-variant py-2 pr-2 pl-4"
                  >
                    <p className="flex-1 py-1.5 md-body-md text-on-surface">
                      {item.content}
                    </p>
                    {forgetting === item.id ? (
                      <span className="grid size-10 place-items-center text-on-surface-variant">
                        <CircularProgress size={18} strokeWidth={2} />
                      </span>
                    ) : (
                      <IconButton
                        icon="close"
                        label="Quên điều này"
                        size="sm"
                        disabled={forgetting !== null}
                        onClick={() => forget(item.id)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 md-body-md text-on-surface-variant">
                Chưa có gì. Cứ trò chuyện, Oraclia sẽ tự nhặt ra những điều đáng
                nhớ.
              </p>
            )}
          </section>

          <section>
            <h2 className="md-title-sm text-on-surface">
              Bộ nhớ của từng cuộc trò chuyện
            </h2>
            {summaries.length ? (
              <ul className="mt-3 flex flex-col gap-3">
                {summaries.map((item) => (
                  <li
                    key={item.title + item.summary.slice(0, 24)}
                    className="rounded-xl border border-outline-variant p-4"
                  >
                    <p className="md-label-md text-on-surface">{item.title}</p>
                    <p className="mt-1 md-body-sm text-on-surface-variant">
                      {item.summary}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 md-body-md text-on-surface-variant">
                Chưa có gì. Phần này chỉ xuất hiện khi một cuộc trò chuyện đủ
                dài để được cô đọng lại; xóa cuộc trò chuyện là xóa luôn phần
                nhớ của nó.
              </p>
            )}
          </section>
        </>
      )}
    </SettingsLayout>
  );
}
