import type { Metadata } from "next";
import Link from "next/link";
import { PRO_PRICE_LABEL } from "@/lib/users";

export const metadata: Metadata = {
  title: "Оплата Pro",
  description: "Оформление подписки Pro через администратора в Telegram.",
};

const TG_LINK = "https://t.me/kollew";

export default function ProPaymentPage() {
  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Оформление Pro</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Pro снимает лимит 5 работ — публикуйте без ограничений. {PRO_PRICE_LABEL}.
      </p>

      <div className="card mt-6 p-6 sm:p-8">
        <div className="text-center">
          <span className="text-5xl">💬</span>
          <h2 className="mt-3 text-xl font-bold text-white">Свяжитесь с администратором</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            Покупка Pro проходит через админа в Telegram — так надёжнее: поможем с выбором срока,
            ответим на вопросы и активируем подписку сразу после оплаты.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-sm font-semibold text-white">Что нужно написать в сообщении:</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-400">
            <li>Ваш юзернейм на DevShelf (или логин)</li>
            <li>На какой срок хотите Pro (1 месяц — {`499 ₽`}, есть скидки за длинный срок)</li>
            <li>Удобный способ оплаты (СБП, карта)</li>
          </ol>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a href={TG_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-primary flex-1">
            ✍️ Написать админу в Telegram
          </a>
          <Link href="/cabinet/edit" className="btn btn-ghost flex-1">
            Вернуться в кабинет
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Обычно отвечаем в течение пары часов. Pro активируется сразу после подтверждения оплаты.
        </p>
      </div>

      {/* Промокод остаётся — им можно активировать Pro без админа */}
      <div className="card mt-4 p-5 sm:p-6">
        <h2 className="font-bold text-white">Есть промокод?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Если у вас есть промокод — Pro можно активировать без администрации. Вводится в{" "}
          <Link href="/cabinet/edit" className="text-lime-300 hover:underline">
            кабинете
          </Link>{" "}
          в блоке подписки.
        </p>
      </div>
    </section>
  );
}
