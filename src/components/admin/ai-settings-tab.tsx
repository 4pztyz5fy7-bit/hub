import { Bot, Sparkles } from "lucide-react";
import { AiComingSoonBanner } from "@/components/ai-coming-soon-banner";

export function AiSettingsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Bot className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold">Настройки генеративного AI</div>
            <div className="text-[11px] text-muted-foreground">
              Включение AI и выбор провайдера, модели и ключей
            </div>
          </div>
        </div>
      </div>

      <AiComingSoonBanner
        title="Мы работаем над созданием лучшего помощника"
        subtitle="Генеративный AI временно отключён. Все настройки провайдеров, ключей и лимитов станут доступны, когда помощник вернётся в работу."
        icon="sparkles"
      />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 text-primary" />
          <div>
            <div className="text-sm font-bold">Что будет в этом разделе</div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground leading-relaxed">
              <li>Выбор провайдера: Google Gemini или Lovable AI Gateway</li>
              <li>Указание API-ключа и модели</li>
              <li>Лимиты сообщений для пользователей и администраторов</li>
              <li>Модерация запросов на противозаконное содержимое</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
