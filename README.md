# Vinho é Vida

Gestão de uma garrafeira pessoal. Funciona no telemóvel e no computador, sem internet, sem conta e sem servidor.

## O que faz

- **Painel**: total de garrafas, valor estimado e, sobretudo, o que tem de ser bebido este ano antes de passar do ponto.
- **Garrafeira**: pesquisa e filtros por tipo, estado da janela de consumo, valor e localização física (garrafeira, prateleira, posição).
- **Harmonizar**: escolhe-se o prato e a app sugere garrafas da própria garrafeira, dando prioridade às que estão no ponto ou a acabar a janela.
- **Abrir garrafa**: tira uma garrafa do stock e guarda a data, a ocasião, com quem, o prato e a nota.
- **Importar CSV** do Vivino, do Oeni ou de uma folha de cálculo. Deteta colunas em português, inglês, alemão e francês. Os duplicados (mesmo produtor, nome e colheita) são juntos e não repetidos.
- **Relatório imprimível** por localização, com valores. Útil para a família e para o seguro.
- **Cópia de segurança** em JSON e exportação em CSV.
- **Contas de utilizador**: criar conta, entrar, recuperar password por email e terminar sessão.
- **Base de dados na nuvem**: a garrafeira fica guardada no Supabase e aparece em qualquer aparelho onde se entre. Cada pessoa só vê os seus vinhos.
- **Fotos dos rótulos**, guardadas de forma privada.
- **Digitalizar rótulo**: tira-se uma foto e a app preenche nome, produtor, colheita, região, castas, perfil, aromas, harmonizações e janela de consumo.

Sem configuração da nuvem a app continua a funcionar só no aparelho, sem conta e sem digitalização.

## Ligar a nuvem (uma vez, cerca de 20 minutos)

1. Criar conta em supabase.com e um projeto novo. Escolher uma região na Europa (por exemplo Frankfurt).
2. No projeto, abrir **SQL Editor**, colar o conteúdo de `supabase/schema.sql` e correr. Isto cria a tabela, o espaço das fotos e as regras de acesso.
3. Em **Authentication > URL Configuration**, pôr em *Site URL* o endereço onde a app vai ficar (por exemplo `https://tiagoduarterossa-cloud.github.io/Vinho-vida-/`) e acrescentar o mesmo em *Redirect URLs*. Sem isto, os links de confirmação e de recuperação de password não funcionam.
4. Em **Project Settings > API**, copiar o *Project URL* e a chave *anon public* para `config.js`.
5. Para a digitalização de rótulos:
   - criar uma chave em console.anthropic.com (é paga por utilização; cada rótulo custa cerca de 1 a 3 cêntimos);
   - instalar a CLI do Supabase e, nesta pasta, correr:
     ```
     supabase login
     supabase link --project-ref <id-do-projeto>
     supabase secrets set ANTHROPIC_API_KEY=<chave>
     supabase functions deploy ler-rotulo
     ```
6. Publicar (GitHub Pages ou outro alojamento estático) e criar a conta na própria app.

O email de confirmação e de recuperação usa o servidor de email de teste do Supabase, que tem um limite baixo de envios por hora. Para uso real convém configurar um SMTP próprio em **Authentication > Emails > SMTP Settings**.

## Como usar

Abrir `index.html` através de um servidor (por exemplo GitHub Pages ou `python3 -m http.server`) e, no telemóvel, usar "Adicionar ao ecrã principal" para instalar.

## Atenção

Sem a nuvem ligada, os dados ficam só no navegador do aparelho e perdem-se se o navegador for limpo. Exporta uma cópia de segurança com regularidade. Com a nuvem, continua a ser boa ideia exportar uma cópia de vez em quando.

A digitalização lê o que está no rótulo, mas as características (castas, perfil, aromas, janela) vêm do conhecimento geral do modelo sobre o vinho ou a região. Podem estar erradas. Confirmar antes de guardar.

A sugestão de janela de consumo é uma estimativa genérica baseada no tipo e no corpo. Não substitui a indicação do produtor nem de um crítico.
