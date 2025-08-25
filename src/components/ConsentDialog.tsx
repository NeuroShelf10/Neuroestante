"use client";

export default function ConsentDialog({
  open,
  onClose,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept?: () => Promise<void> | void; // opcional: se passar, aparece botão "Aceitar e continuar"
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <h1 className="text-xl font-bold">Termo de Consentimento</h1>

        <p>
          A plataforma <strong>Neuroestante</strong> encontra-se em fase inicial de
          desenvolvimento. Embora todos os esforços estejam sendo realizados para
          garantir estabilidade e usabilidade, poderão ocorrer falhas técnicas,
          travas temporárias ou indisponibilidades.
        </p>

        <p>
          O usuário é o <strong>único responsável</strong> pelas informações cadastradas,
          especialmente os dados de pacientes. Conforme o{" "}
          <strong>Código de Ética Profissional do Psicólogo</strong> (Resolução CFP nº 010/2005),
          o sigilo, a confidencialidade e a veracidade das informações são de responsabilidade do
          profissional.
        </p>

        <p>
          A plataforma disponibiliza recursos de apoio com uso de{" "}
          <strong>inteligência artificial (“Neura IA”)</strong>, que podem sugerir descrições,
          preenchimentos ou referências. A IA pode apresentar erros, imprecisões ou informações
          desatualizadas. As sugestões não substituem o julgamento clínico e técnico do
          profissional, que deve revisar e validar cada informação.
        </p>

        <p>
          Os dados são armazenados em servidores seguros, com autenticação individual. O usuário
          deve manter em sigilo suas credenciais de acesso. O acesso integral à plataforma depende
          da aceitação deste termo e da manutenção de uma assinatura ativa.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          {!!onAccept && (
            <button
              onClick={() => onAccept?.()}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
            >
              Aceitar e continuar
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
