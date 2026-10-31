# Vinho Vida

Gestão de uma garrafeira pessoal. Funciona no telemóvel e no computador, sem internet, sem conta e sem servidor.

## O que faz

- **Painel**: total de garrafas, valor estimado e, sobretudo, o que tem de ser bebido este ano antes de passar do ponto.
- **Garrafeira**: pesquisa e filtros por tipo, estado da janela de consumo, valor e localização física (garrafeira, prateleira, posição).
- **Harmonizar**: escolhe-se o prato e a app sugere garrafas da própria garrafeira, dando prioridade às que estão no ponto ou a acabar a janela.
- **Abrir garrafa**: tira uma garrafa do stock e guarda a data, a ocasião, com quem, o prato e a nota.
- **Importar CSV** do Vivino, do Oeni ou de uma folha de cálculo. Deteta colunas em português, inglês, alemão e francês. Os duplicados (mesmo produtor, nome e colheita) são juntos e não repetidos.
- **Relatório imprimível** por localização, com valores. Útil para a família e para o seguro.
- **Cópia de segurança** em JSON e exportação em CSV.

## Como usar

Abrir `index.html` através de um servidor (por exemplo GitHub Pages ou `python3 -m http.server`) e, no telemóvel, usar "Adicionar ao ecrã principal" para instalar.

## Atenção

Os dados ficam guardados apenas no navegador do aparelho. Se o navegador for limpo, perdem-se. Exporta uma cópia de segurança com regularidade.

A sugestão de janela de consumo é uma estimativa genérica baseada no tipo e no corpo. Não substitui a indicação do produtor nem de um crítico.
