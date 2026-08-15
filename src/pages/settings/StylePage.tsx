import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  CircularProgress,
  TextField,
  useSnackbar,
} from "@/components";
import { getUserSettings, saveUserSettings } from "@db";
import { SettingsLayout } from "./SettingsLayout";

const presets = [
  "Ngắn gọn, đi thẳng vào ý chính",
  "Nói chuyện thân mật, xưng hô gần gũi",
  "Phân tích kỹ, nhiều tầng nghĩa",
  "Thực tế, ưu tiên hành động cụ thể",
  "Nhẹ nhàng, tránh nói nặng",
];

export default function StylePage() {
  const snackbar = useSnackbar();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserSettings()
      .then((settings) => setValue(settings.response_style))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  function append(preset: string) {
    setValue((current) => {
      if (current.includes(preset)) return current;
      return current.trim() ? `${current.trim()}\n${preset}` : preset;
    });
  }

  async function save() {
    setBusy(true);
    try {
      await saveUserSettings({ response_style: value.trim() });
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
      title="Bạn muốn tôi trả lời như thế nào?"
      description="Cách viết, độ dài, giọng điệu. Riêng các nguyên tắc an toàn thì Oraclia vẫn giữ."
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
      {loading ? (
        <div className="grid place-items-center py-10 text-on-surface-variant">
          <CircularProgress size={28} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Chip
                key={preset}
                label={preset}
                icon="add"
                onClick={() => append(preset)}
              />
            ))}
          </div>

          <TextField
            label="Phong cách trả lời"
            multiline
            rows={6}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ví dụ: viết ngắn, không hoa mỹ, kết thúc bằng một việc cụ thể nên làm."
          />
        </>
      )}
    </SettingsLayout>
  );
}
