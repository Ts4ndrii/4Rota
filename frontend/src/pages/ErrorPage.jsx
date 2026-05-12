import { Link } from 'react-router-dom';

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-500 drop-shadow-lg">500</h1>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-3">Внутрішня помилка сервера</h2>
        <p className="text-dark-300 text-lg mb-2">
          Вибачте, щось пішло не так на нашому боці.
        </p>
        <p className="text-dark-400 text-sm mb-8">
          Наша команда вже знає про цю проблему і працює над її вирішенням.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors duration-200"
          >
            На головну
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-6 py-3 bg-dark-800 text-white rounded-lg font-semibold hover:bg-dark-700 transition-colors duration-200"
          >
            Спробувати знову
          </button>
        </div>

        <div className="mt-12 text-dark-500">
          <p className="text-sm">Помилка 500: Внутрішня помилка сервера</p>
        </div>
      </div>
    </div>
  );
}
