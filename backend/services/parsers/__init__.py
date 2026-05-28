from .sap_parser import SAPParser
from .utility_parser import UtilityParser
from .travel_parser import TravelParser

PARSER_MAP = {
    "sap": SAPParser,
    "utility": UtilityParser,
    "travel": TravelParser,
}
