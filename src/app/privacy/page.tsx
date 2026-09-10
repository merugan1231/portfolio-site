import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Как DevShelf собирает, использует и защищает данные пользователей.",
};

export default function PrivacyPage() {
  return (
    <section className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-indigo-500" />
      <Link href="/" className="relative text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        ← На главную
      </Link>

      <h1 className="relative mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Политика <span className="gradient-text">конфиденциальности</span>
      </h1>
      <p className="relative mt-4 text-sm text-zinc-500">
        Действует с 9 сентября 2026 года. Сервис: DevShelf (далее — «Сервис»).
      </p>

      <div className="relative mt-10 space-y-8 text-sm leading-relaxed text-zinc-300">
        <div>
          <h2 className="text-lg font-bold text-white">1. Какие данные мы собираем</h2>
          <ul className="mt-3 space-y-2 text-zinc-400">
            <li>• <strong className="text-zinc-200">Учётные данные:</strong> логин, email, хеш пароля (пароль в открытом виде не хранится никогда). При входе через Google — email и имя из вашего Google-аккаунта.</li>
            <li>• <strong className="text-zinc-200">Данные профиля:</strong> юзернейм, отображаемое имя, аватар, биография и её пункты, контакты, которые вы добавили сами.</li>
            <li>• <strong className="text-zinc-200">Содержимое:</strong> ваши работы (описания, ссылки, коды подтверждения) и отзывы других пользователей о них.</li>
            <li>• <strong className="text-zinc-200">Служебные данные:</strong> дата регистрации, тариф, сессии входа, коды подтверждения почты.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">2. Зачем нам эти данные</h2>
          <ul className="mt-3 space-y-2 text-zinc-400">
            <li>• работать Сервиса: аккаунты, профили, публичные страницы работ;</li>
            <li>• подтверждения вашей почты и важных действий (например, удаления аккаунта);</li>
            <li>• модерации: рассмотрение споров по оценкам и проверка авторства;</li>
            <li>• связи с вами по вопросам, которые вы сами инициировали.</li>
          </ul>
          <p className="mt-3 text-zinc-400">
            Мы не продаём и не передаём ваши данные третьим лицам для рекламы. Из сервиса ваши данные
            не уходят, кроме случаев, когда этого требует закон.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">3. Что видно другим пользователям</h2>
          <p className="mt-3 text-zinc-400">
            Публично доступны: ваш юзернейм, имя, аватар, биография, добавленные вами контакты и ваши
            работы со статусом авторства и оценками. <strong className="text-zinc-200">Ваш email и пароль публично
            не видны никогда.</strong> Стаж на сервисе (дата регистрации) виден только вам в кабинете.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">4. Cookies</h2>
          <p className="mt-3 text-zinc-400">
            Сервис использует один служебный cookie — токен сессии, чтобы вы оставались войдёнными.
            Он не используется для трекинга и аналитики. Аналитических систем на Сервисе нет.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">5. Хранение и безопасность</h2>
          <ul className="mt-3 space-y-2 text-zinc-400">
            <li>• Пароли хранятся только в виде хеша (SHA-256 с солью сервиса).</li>
            <li>• Сессии действуют 7 дней, после чего требуют повторного входа.</li>
            <li>• Коды подтверждения действуют 10 минут и одноразовые.</li>
            <li>• Данные хранятся у облачных провайдеров (Vercel — приложение, Neon — база данных, Resend — письма) в защищённых инфраструктурах.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">6. Удаление аккаунта</h2>
          <p className="mt-3 text-zinc-400">
            Вы можете удалить свой аккаунт самостоятельно в личном кабинете — для этого нужны код с
            вашей почты и пароль. При удалении безвозвратно стираются: аккаунт, все ваши работы, ваши
            отзывы (и отзывы о ваших работах), сессии. Этот действие необратимо — данные не восстанавливаются.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">7. Дети</h2>
          <p className="mt-3 text-zinc-400">
            Сервис не предназначен для лиц младше 14 лет. Если вы считаете, что аккаунт принадлежит
            ребёнку, — напишите нам, он будет удалён.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">8. Изменения политики</h2>
          <p className="mt-3 text-zinc-400">
            Мы можем обновлять эту политику. Актуальная версия всегда доступна на этой странице, дата
            обновления указана сверху. Существенные изменения анонсируются на главной странице Сервиса.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">9. Контакты</h2>
          <p className="mt-3 text-zinc-400">
            Вопросы о конфиденциальности и ваших данных:{" "}
            <a
              href="https://t.me/kollew"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-300 underline-offset-4 hover:text-lime-200 hover:underline"
            >
              наш Telegram
            </a>
            . Там же — предложения, реклама и сообщения о проблемах.
          </p>
        </div>
      </div>
    </section>
  );
}
