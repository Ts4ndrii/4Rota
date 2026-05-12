import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-brand-500 drop-shadow-lg">404</h1>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-3">Сторінку не знайдено</h2>
        <p className="text-dark-300 text-lg mb-2">
          На жаль, сторінка, яку ви шукаєте, не існує.
        </p>
        <p className="text-dark-400 text-sm mb-8">
          Сторінка могла бути видалена або адреса введена неправильно.
        </p>

        <Link
          to="/"
          className="inline-block px-8 py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors duration-200"
        >
          Повернутись на головну
        </Link>

        <div className="mt-12 text-dark-500">
          <p className="text-sm">Помилка 404: Ресурс не знайдено</p>
        </div>
      </div>
    </div>
  );
}
