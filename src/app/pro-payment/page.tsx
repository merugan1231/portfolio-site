import type { Metadata } from "next";
import Link from "next/link";
import { PRO_PRICE_LABEL } from "@/lib/users";
import CopyField from "./CopyField";
import ReceiptForm from "./ReceiptForm";

export const metadata: Metadata = {
  title: "Оплата Pro",
  description: "Оформление подписки Pro: реквизиты для оплаты и отправка чека на проверку.",
};

const CARD_NUMBER = "2204 3211 7295 0305";
const PHONE = "+7 988 153-23-75";
const PHONE_RAW = "+79881532375";
const PRICE = 499;

export default function ProPaymentPage() {
  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Оплата Pro</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Pro снимает лимит 5 работ — публикуйте без ограничений. {PRO_PRICE_LABEL}.
      </p>

      {/* Шаг 1: реквизиты */}
      <div className="card mt-6 p-5 sm:p-6">
        <h2 className="font-bold text-white">1. Оплатите переводом</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Стоимость: <span className="font-semibold text-white">499 ₽ за 1 месяц</span> (2 мес — {PRICE * 2} ₽, 3 мес — {PRICE * 3} ₽ — срок выбирается в заявке ниже).
        </p>

        <div className="mt-4 space-y-3">
          <CopyField label="Карта (перевод по номеру карты)" value={CARD_NUMBER} mono />
          <CopyField label="Телефон (СБП)" value={PHONE} valueHref={`tel:${PHONE_RAW}`} />
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Перевод можно сделать через приложение банка: СБП по номеру телефона или по номеру карты.
        </p>
      </div>

      {/* Шаг 2: форма заявки с чеком */}
      <div className="card mt-4 p-5 sm:p-6">
        <h2 className="font-bold text-white">2. Пришлите чек на проверку</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Загрузите скриншот чека/перевода на любой фотохостинг или файлообменник (imgur, Яндекс.Диск с общим доступом и т.п.)
          и вставьте ссылку. Администрация проверит перевод и активирует Pro — обычно в течение дня.
        </p>
        <ReceiptForm />
      </div>

      {/* Шаг 3: что дальше */}
      <div className="card mt-4 p-5 sm:p-6">
        <h2 className="font-bold text-white">3. Что дальше</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-400">
          <li>Заявка попадает в очередь проверки администрации.</li>
          <li>После проверки статус появится в кабинете: Pro активируется автоматически.</li>
          <li>Если возникнут вопросы — напишите в разделе «Тикеты».</li>
        </ol>
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        Уже есть Pro или есть промокод? Управляйте этим в{" "}
        <Link href="/cabinet/edit" className="text-lime-300 hover:underline">
          кабинете
        </Link>
        .
      </p>
    </section>
  );
}
